import { handle } from '../../../lib/service';
const route=(request:Request)=>handle(request,new URL(request.url).pathname.replace('/api/',''));
export const GET=route;
export const POST=route;
export const PATCH=route;
