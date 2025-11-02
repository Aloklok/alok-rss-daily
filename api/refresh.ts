import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function (req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Redirect to the root of the application, triggering a refresh of the main page.
    // Using 302 Found or 303 See Other is appropriate for a temporary redirect.
    res.redirect(302, '/');
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
