export type Vod = { id:string; title:string; duration:string; date:string; url:string; };
export type Campaign = { id:string; streamer:string; initials:string; twitchUser:string; budget:number; targetViews:number; deliveredViews:number; budgetUsed:number; clipsAccepted:number; status:"open"|"upcoming"|"closed"; vods:Vod[]; };
export type Clip = { id:string; campaignId:string; title:string; platform:string; url:string; views:number; earned:number; status:"pending"|"paid"|"rejected"; submittedBy:string; submittedById:string; date:string; };
export const campaigns: Campaign[] = [
  { id:"c1",streamer:"DLOU",initials:"DL",twitchUser:"dlou",budget:750,targetViews:1500000,deliveredViews:1100000,budgetUsed:573.43,clipsAccepted:37,status:"open",
    vods:[{id:"v1",title:"DLOU reacts to fan DMs",duration:"3:42:00",date:"2026-04-13",url:"https://www.twitch.tv/videos/2000000001"},{id:"v2",title:"DLOU road to 100k stream",duration:"2:11:00",date:"2026-04-12",url:"https://www.twitch.tv/videos/2000000002"}]},
  { id:"c2",streamer:"FRNK TOO FUNNY",initials:"FR",twitchUser:"frnktoofunny",budget:750,targetViews:1500000,deliveredViews:9275,budgetUsed:4.64,clipsAccepted:3,status:"open",
    vods:[{id:"v3",title:"FRNK night stream highlights",duration:"2:11:00",date:"2026-04-12",url:"https://www.twitch.tv/videos/2000000003"}]},
  { id:"c3",streamer:"Bendadonnn",initials:"BD",twitchUser:"bendadonnn",budget:750,targetViews:1500000,deliveredViews:0,budgetUsed:0,clipsAccepted:0,status:"upcoming",vods:[]},
];
export const clips: Clip[] = [
  {id:"cl1",campaignId:"c1",title:"\"I like to be challenged\" #dlou",platform:"tiktok",url:"https://tiktok.com/@clippedbyjayway/video/1",views:720000,earned:360,status:"paid",submittedBy:"ClipperJay",submittedById:"u1",date:"2026-04-10"},
  {id:"cl2",campaignId:"c1",title:"DLOU gets rejected then she realizes",platform:"tiktok",url:"https://tiktok.com/@clippedbyjayway/video/2",views:80000,earned:40,status:"paid",submittedBy:"ClipperJay",submittedById:"u1",date:"2026-04-11"},
  {id:"cl3",campaignId:"c1",title:"D Lou Already Bugging Out in Miami",platform:"tiktok",url:"https://tiktok.com/@5star_clips/video/1",views:60000,earned:30,status:"paid",submittedBy:"5StarClips",submittedById:"u2",date:"2026-04-12"},
  {id:"cl4",campaignId:"c2",title:"FRNK reacts to OBlock beef clip",platform:"tiktok",url:"https://tiktok.com/@frnkclipper/video/1",views:9275,earned:4.64,status:"pending",submittedBy:"ClipperJay",submittedById:"u1",date:"2026-04-13"},
];
