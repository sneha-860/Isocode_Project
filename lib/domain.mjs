export const categories = ['Room booking','Wedding','Corporate offsite','Complaint','Unsorted'];
export const owners = { 'Room booking':'Reservations', Wedding:'Events team', 'Corporate offsite':'Sales team', Complaint:'GM', Unsorted:'GM review' };
const training = {
 'Room booking':['book a room villa stay nights adults child availability free dates','reservation accommodation suite room weekend check in check out','is a villa free for two adults and a child'],
 Wedding:['wedding sister bride groom celebration reception marriage venue guests','wedding venue ceremony family marriage lawn two nights','wedding in february about guests'],
 'Corporate offsite':['team corporate offsite conference hall company retreat workshop employees','business meeting team building offsite january conference','office event company conference hall delegates'],
 Complaint:['complaint refund dirty unsafe rude service disappointed','terrible experience room unclean broken noise angry','complain manager staff bad service']
};
const tokenize = s=>s.toLowerCase().match(/[a-z]+/g)||[];
const vocab = new Set(Object.values(training).flatMap(a=>tokenize(a.join(' '))));
const models = Object.entries(training).map(([category,docs])=>{ const words=tokenize(docs.join(' '));return {category,words, counts:words.reduce((a,w)=>(a[w]=(a[w]||0)+1,a),{})}; });
export function classify(message) {
 const tokens=tokenize(message).filter(w=>vocab.has(w));
 const complaint=/\b(complain\w*|refund|unsafe|dirty|rude|terrible|harass\w*|disappointed|unclean|broken)\b/i.test(message);
 const scores=models.map(m=>({category:m.category,score:tokens.reduce((s,w)=>s+Math.log(((m.counts[w]||0)+1)/(m.words.length+vocab.size)),0)})).sort((a,b)=>b.score-a.score);
 const z=scores.reduce((s,m)=>s+Math.exp(m.score-scores[0].score),0);
 const confidence=tokens.length<2?35:Math.min(98,Math.round(100/z));
 const eventConflict=/\bwedding\b/i.test(message)&&/\b(offsite|corporate|conference)\b/i.test(message);
 const category=complaint?'Complaint':confidence<70||eventConflict?'Unsorted':scores[0].category;
 return {category,confidence:complaint?98:confidence,owner:owners[category],alert:complaint?1:0};
}
export function extract(message) {
 const guests=message.match(/(?:team of\s*)?(\d+)\s*(?:guests|people|persons|adults|delegates|employees)/i)||message.match(/team of\s*(\d+)/i);
 const child=message.match(/(?:and\s+)?(a|one|\d+)\s*child(?:ren)?/i);
 const budget=message.match(/(?:budget\s*(?:of|is|:)?\s*|₹\s*|rs\.?\s*)([\d,.]+\s*(?:lakh|lakhs|lac|crore|k)?)/i);
 const dates=message.match(/\d{4}-\d{2}-\d{2}(?:\s*(?:to|–|-)\s*\d{4}-\d{2}-\d{2})?|(?:\d{1,2}\s*[-–]\s*\d{1,2}\s+)?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\s+\d{4})?/i);
 return {dates:dates?.[0]||null,guests:guests?Number(guests[1]):null,children:child?(child[1]==='a'||child[1]==='one'?1:Number(child[1])):null,budget:budget?.[1]||null,nights:Number(message.match(/(\d+)\s*nights?/i)?.[1])||null};
}
export function draftReply(name,category,fields) {
 const first=name.split(' ')[0];
 if(category==='Complaint')return `Dear ${first}, thank you for bringing this to our attention. I am sorry your experience fell short. Our General Manager has been alerted. Could you share your booking reference and a convenient time for us to contact you?`;
 if(category==='Unsorted')return `Dear ${first}, thank you for reaching out to Mora Estate. Could you tell us a little more about your plans, including your preferred dates and number of guests? Our team will help you plan the next step.`;
 return `Dear ${first}, thank you for considering Mora Estate for your ${category==='Wedding'?'wedding celebration':category==='Corporate offsite'?'team offsite':'stay'}.${fields.dates?` We have noted your dates: ${fields.dates}.`:''}${fields.guests?` We have noted ${fields.guests} guests.`:''} ${fields.dates?'Please confirm the exact check-in and check-out dates, including the year.':'Could you share your preferred check-in and check-out dates?'} ${fields.guests?'':'Please also let us know the number of adults and children. '}Our ${owners[category].toLowerCase()} will check availability and prepare a quote. Rates and availability are only confirmed at booking.`;
}
export function day(offset=0,from=new Date()) {const d=new Date(from);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);}
export function stayDates(arrival,departure,today=day()) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(arrival||'')||!/^\d{4}-\d{2}-\d{2}$/.test(departure||''))throw Error('Choose valid arrival and departure dates.');
 const a=new Date(arrival+'T00:00:00Z'),b=new Date(departure+'T00:00:00Z');
 if(!Number.isFinite(+a)||!Number.isFinite(+b)||a.toISOString().slice(0,10)!==arrival||b.toISOString().slice(0,10)!==departure)throw Error('Choose valid calendar dates.');
 const n=(+b-+a)/86400000;
 if(arrival<today||n<1||n>14||departure>day(180,new Date(today)))throw Error('Choose a stay of 1–14 nights within the next 180 days.');
 return Array.from({length:n},(_,i)=>day(i,a));
}
export function price(nights) { const subtotal=nights.reduce((s,n)=>s+n.rate,0); const tax=nights.reduce((s,n)=>s+Math.round(n.rate*(n.rate<=750000?.05:.18)),0);return {subtotal,tax,total:subtotal+tax}; }
