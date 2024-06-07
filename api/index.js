import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import cron from 'node-cron';
import { initializeDatabase, getWebsites, addWebsite, updateWebsiteStatus, deleteWebsite, setNotificationSent, dbPromise } from './database.js';
import sgMail from '@sendgrid/mail';
import { config } from 'dotenv'; 
import ping from 'ping';
const app = express();
const port = 3000;
config();
// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Replace with your SendGrid API key
const notificationEmail = process.env.NOTIFICATION_EMAIL; // Replace with your notification email

app.use(bodyParser.json());
app.use(express.static('public'));

async function checkWebsite(website) {
  const db = await dbPromise;
  const websiteRecord = await db.get('SELECT * FROM websites WHERE url = ?', website.url);
  
  try {
    const res = await ping.promise.probe(website.url);
    if (!res.alive) {
      throw new Error(`Website is down`);
    }

    if (websiteRecord.status === 'Down') {
      await updateWebsiteStatus(website.url, 'Up');
      sendNotificationEmail(website.url, 'Website is up');
    } else {
      await updateWebsiteStatus(website.url, 'Up');
    }
  } catch (error) {
    if (websiteRecord.status === 'Up' || websiteRecord.notification_sent === 0) {
      await updateWebsiteStatus(website.url, 'Down');
      sendNotificationEmail(website.url, `${error.message}`);
      await setNotificationSent(website.url);
    }
  }
}

function sendNotificationEmail(website, message) {
  const msg = {
    to: notificationEmail,
    from: 'test1046@gmail.com',
    subject: 'Website Status Alert',
    text: `The website ${website} status changed: ${message}`,
  };

  sgMail.send(msg)
    .then(() => {
      console.log('Notification email sent');
    })
    .catch((error) => {
      console.error(`Error while sending email: ${error}`);
    });
}

cron.schedule('* * * * *', async () => {
  const websites = await getWebsites();
  websites.forEach(checkWebsite);
});

app.get('/api/websites', async (req, res) => {
  const websites = await getWebsites();
  res.json(websites);
});

app.post('/api/websites', async (req, res) => {
  const { url } = req.body;
  if (url) {
    await addWebsite(url, 'Unknown');
    await checkWebsite({ url }); // Check the status immediately after adding the website
    res.status(201).json({ message: 'Website added' });
  } else {
    res.status(400).json({ message: 'URL is required' });
  }
});

app.delete('/api/websites', async (req, res) => {
  const { url } = req.body;
  if (url) {
    await deleteWebsite(url);
    res.status(200).json({ message: 'Website deleted' });
  } else {
    res.status(400).json({ message: 'URL is required' });
  }
});

initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
});
