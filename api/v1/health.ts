// Vercel Serverless Function: GET /api/v1/health
export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
}
