// Legacy D1 access retired: Supabase enforces authentication and MFA.
export async function GET(){return Response.json({error:'API remplacée par Supabase. Rechargez MELECGEST.'},{status:410});}
export async function POST(){return GET();}
