#!/usr/bin/env bash
# End-to-end check of accounts, profiles, contracts and clip tracking against a running app.
# Usage: BASE=http://localhost:3000 bash scripts/e2e-accounts.sh   (needs ALLOW_DEMO_LOGIN=1 for the demo streamer)
BASE=${BASE:-http://localhost:3000}
T=".e2e-tmp-$$"; mkdir -p "$T"; PASS=0; FAIL=0
RUN=$(date +%s)
ok(){ PASS=$((PASS+1)); echo "  ok   $1"; }
bad(){ FAIL=$((FAIL+1)); echo "  FAIL $1 -> $2"; }
expect(){ [ "$2" = "$3" ] && ok "$1" || bad "$1" "got $2, want $3 :: $(head -c 200 $T/body 2>/dev/null)"; }
req(){ # jar method path [json]
  local jar=$1 m=$2 p=$3 d=$4
  if [ -n "$d" ]; then curl -s -o $T/body -w "%{http_code}" -b $T/$jar -c $T/$jar -X $m -H "Content-Type: application/json" --data "$d" "$BASE$p" --max-time 120
  else curl -s -o $T/body -w "%{http_code}" -b $T/$jar -c $T/$jar -X $m "$BASE$p" --max-time 120; fi
}
login(){ # jar provider email password
  local jar=$1
  local csrf=$(curl -s -b $T/$jar -c $T/$jar "$BASE/api/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
  curl -s -o /dev/null -b $T/$jar -c $T/$jar -X POST "$BASE/api/auth/callback/$2" --data-urlencode "csrfToken=$csrf" --data-urlencode "email=$3" --data-urlencode "password=$4" --max-time 120
  curl -s -b $T/$jar "$BASE/api/auth/session" --max-time 60
}
body(){ cat $T/body; }
jv(){ node -e "const j=JSON.parse(require('fs').readFileSync('$T/body','utf8'));console.log($1)"; }
has(){ node -e "const j=JSON.parse(require('fs').readFileSync('$T/body','utf8'));process.exit(($1)?0:1)"; }

A="a$RUN@test.clipfarm.dev"; B="b$RUN@test.clipfarm.dev"; PW="Farmtest123"
AUP=$(echo "$A" | tr a-z A-Z)
echo "Sign-up rules"
expect "bad email rejected"      $(req anon POST /api/account/signup "{\"name\":\"A\",\"email\":\"nope\",\"password\":\"$PW\",\"agree\":true}") 400
expect "weak password rejected"  $(req anon POST /api/account/signup "{\"name\":\"A\",\"email\":\"$A\",\"password\":\"short\",\"agree\":true}") 400
expect "must agree to terms"     $(req anon POST /api/account/signup "{\"name\":\"A\",\"email\":\"$A\",\"password\":\"$PW\"}") 400
expect "clipper A signs up"      $(req anon POST /api/account/signup "{\"name\":\"Alex Test\",\"email\":\"$A\",\"password\":\"$PW\",\"role\":\"clipper\",\"agree\":true}") 201
expect "same email (any case) blocked" $(req anon POST /api/account/signup "{\"name\":\"A\",\"email\":\"$AUP\",\"password\":\"$PW\",\"agree\":true}") 409
expect "clipper B signs up"      $(req anon POST /api/account/signup "{\"name\":\"Bo Test\",\"email\":\"$B\",\"password\":\"$PW\",\"agree\":true}") 201

echo "Log in"
S=$(login bad password "$A" "WrongPass999"); echo "$S" | grep -q '"user"' && bad "wrong password refused" "got a session" || ok "wrong password refused"
S=$(login a password "$A" "$PW"); echo "$S" | grep -q "\"email\":\"$A\"" && ok "clipper A logs in" || bad "clipper A logs in" "$S"
login b password "$B" "$PW" >/dev/null
expect "signed-out profile blocked" $(req anon GET /api/account/profile) 401

echo "Profile"
expect "read profile"            $(req a GET /api/account/profile) 200
[ "$(jv j.complete)" = "false" ] && ok "new profile marked incomplete" || bad "incomplete flag" "$(body)"
expect "bad username rejected"   $(req a PATCH /api/account/profile '{"username":"x!"}') 400
expect "save profile"            $(req a PATCH /api/account/profile "{\"username\":\"alex$RUN\",\"tiktokHandle\":\"@alexclips$RUN\",\"bio\":\"I clip\"}") 200
[ "$(jv j.complete)" = "true" ] && ok "profile now complete" || bad "complete flag" "$(body)"
[ "$(jv j.tiktokHandle)" = "alexclips$RUN" ] && ok "@ stripped from handle" || bad "handle cleanup" "$(body)"
expect "B can't take A's username" $(req b PATCH /api/account/profile "{\"username\":\"alex$RUN\"}") 409

echo "Contracts"
login s creator-demo x x >/dev/null
req s POST /api/account/terms '{"agree":false}' >/dev/null
expect "streamer accepts terms"  $(req s POST /api/account/terms '{"agree":true}') 200
expect "budget under \$100 refused" $(req s POST /api/campaigns '{"budget":50,"targetViews":100000}') 400
expect "streamer posts contract" $(req s POST /api/campaigns '{"budget":200,"targetViews":100000,"streamer":"Demo Streamer","rate":9}') 201
CID=$(jv j.id); [ "$(jv j.twitchUser)" = "dlou" ] && ok "contract tied to streamer's own channel" || bad "channel" "$(body)"
[ "$(jv j.rate)" = "1" ] && ok "contract uses the app-wide \$1.00 rate (typed rate ignored)" || bad "rate" "$(body)"
expect "clipper can't post contract" $(req a POST /api/campaigns '{"budget":200,"targetViews":100000}') 403
expect "streamer can't submit clips" $(req s POST /api/clips "{\"campaignId\":\"$CID\",\"url\":\"https://www.tiktok.com/@x/video/1\"}") 403
req anon GET /api/campaigns >/dev/null; has "j.some(c=>c.id==='$CID')" && ok "contract listed for clippers" || bad "listing" "$(body | head -c 200)"

echo "Clips"
V1="7$RUN"01; V2="7$RUN"02
expect "wrong TikTok account blocked" $(req a POST /api/clips "{\"campaignId\":\"$CID\",\"url\":\"https://www.tiktok.com/@someoneelse/video/$V1\"}") 403
expect "B without handle blocked"     $(req b POST /api/clips "{\"campaignId\":\"$CID\",\"url\":\"https://www.tiktok.com/@bo/video/$V2\"}") 400
expect "A submits a clip"             $(req a POST /api/clips "{\"campaignId\":\"$CID\",\"url\":\"https://www.tiktok.com/@alexclips$RUN/video/$V1\",\"title\":\"Big moment\"}") 201
CLIP=$(jv j.id)
expect "same video can't be sent twice" $(req a POST /api/clips "{\"campaignId\":\"$CID\",\"url\":\"https://www.tiktok.com/@alexclips$RUN/video/$V1\"}") 409
req a GET /api/clips >/dev/null; [ "$(jv j.length)" = "1" ] && ok "A sees their 1 clip" || bad "A clips" "$(body)"
req b GET /api/clips >/dev/null; [ "$(jv j.length)" = "0" ] && ok "B sees none of A's clips" || bad "isolation" "$(body)"
req s GET "/api/clips?as=creator" >/dev/null; has "j.some(c=>c.id==='$CLIP')" && ok "streamer sees it to review" || bad "review list" "$(body | head -c 200)"
req a GET "/api/clips?as=creator" >/dev/null; [ "$(jv j.length)" = "0" ] && ok "clipper sees no review queue" || bad "review isolation" "$(body)"

echo "Review and payout math"
expect "clipper can't approve own clip" $(req a PATCH /api/clips/$CLIP '{"action":"approve","views":999999}') 403
expect "streamer approves 120K views"   $(req s PATCH /api/clips/$CLIP '{"action":"approve","views":120000}') 200
[ "$(jv j.earned)" = "120" ] && ok "earned \$120 (120K x \$1.00/1K)" || bad "earnings" "$(body)"
expect "can't approve twice"            $(req s PATCH /api/clips/$CLIP '{"action":"approve","views":120000}') 409
req s GET "/api/campaigns?mine=1" >/dev/null
has "(c=>c&&c.budgetUsed===144&&c.deliveredViews===120000&&c.clipsAccepted===1)(j.find(c=>c.id==='$CID'))" && ok "contract spent \$144 (\$120 + 20% fee)" || bad "contract totals" "$(body | head -c 300)"
expect "short link refused without TikTok sign-in" $(req a POST /api/clips "{\"campaignId\":\"$CID\",\"url\":\"https://www.tiktok.com/t/ZTabc123/\"}") 400
expect "A submits a 2nd clip"           $(req a POST /api/clips "{\"campaignId\":\"$CID\",\"url\":\"https://www.tiktok.com/@alexclips$RUN/video/$V2\"}") 201
C2=$(jv j.id)
expect "approve 500K (over budget)"     $(req s PATCH /api/clips/$C2 '{"action":"approve","views":500000}') 200
[ "$(jv j.earned)" = "46.66" ] && [ "$(jv j.capped)" = "true" ] && ok "capped: \$46.66 + fee uses the last \$56" || bad "budget cap" "$(body)"
req anon GET /api/campaigns >/dev/null; has "!j.some(c=>c.id==='$CID')" && ok "spent contract closes" || bad "close on spend" ""
req a GET /api/clips >/dev/null; has "Math.round(j.filter(c=>c.status==='paid').reduce((a,c)=>a+c.earned,0)*100)===16666" && ok "A's approved total is \$166.66" || bad "A total" "$(body)"

echo "Password, reset, export, delete"
expect "change password needs current" $(req a POST /api/account/password '{"current":"nope","next":"Newpass4567"}') 403
expect "change password"               $(req a POST /api/account/password "{\"current\":\"$PW\",\"next\":\"Newpass4567\"}") 200
S=$(login a2 password "$A" "Newpass4567"); echo "$S" | grep -q '"user"' && ok "logs in with new password" || bad "new password login" "$S"
echo "  ...waiting 65s for the old session check"; sleep 65
expect "old session signed out after password change" $(req a GET /api/account/profile) 401
expect "new session still works" $(req a2 GET /api/account/profile) 200
expect "forgot-password answers"       $(req anon POST /api/account/forgot "{\"email\":\"$B\"}") 200
expect "forgot for unknown email same" $(req anon POST /api/account/forgot '{"email":"nobody@test.clipfarm.dev"}') 200
expect "bad reset token rejected"      $(req anon POST /api/account/reset '{"token":"nope","password":"Whatever123"}') 400
expect "export my data"                $(req a2 GET /api/account/export) 200
[ "$(jv j.clips.length)" = "2" ] && ok "export has A's 2 clips" || bad "export" "$(body | head -c 200)"
grep -q passwordHash $T/body && bad "export leaks password hash" "" || ok "export has no password hash"
expect "delete needs DELETE typed"     $(req b DELETE /api/account/profile '{"confirm":"no"}') 400
expect "B deletes account"             $(req b DELETE /api/account/profile '{"confirm":"DELETE"}') 200
S=$(login b2 password "$B" "$PW"); echo "$S" | grep -q '"user"' && bad "deleted account can't log in" "$S" || ok "deleted account can't log in"

echo "Pages"
for p in / /login /forgot-password /reset-password /settings /dashboard; do expect "page $p" $(curl -s -o /dev/null -w "%{http_code}" --max-time 120 $BASE$p) 200; done

echo; echo "PASSED $PASS  FAILED $FAIL"
echo "test accounts: $A $B  contract: $CID"
rm -rf $T
[ $FAIL = 0 ]
