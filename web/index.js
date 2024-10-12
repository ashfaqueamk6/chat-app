// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const partnerApiUrl = 'https://api.greenapi.com';
const partnerToken = 'gac.8fcbb1b93eca477ebca0084f7537e721ec829930442647';

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());



app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});


app.get('/api/gteInstances', async (req, res) => {
  try {
    // Fetch the instances
    const response = await fetch(`${partnerApiUrl}/partner/getInstances/${partnerToken}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Parse the JSON response
    const instances = await response.json();

    // Log the response to inspect the structure
    console.log('API response:', instances);

    // Check if the instances object contains an array (adjust this based on the response structure)
    if (!instances || !Array.isArray(instances)) {
      throw new Error('Invalid instances response: Expected an array of instances');
    }

    // Use Promise.all to fetch state for each instance
    const updatedInstances = await Promise.all(
      instances.map(async (instance) => {
        try {
          // Normalize the apiUrl to ensure it doesn't have trailing or double slashes
          const normalizedApiUrl = instance.apiUrl.endsWith('/')
            ? instance.apiUrl.slice(0, -1)
            : instance.apiUrl;

          // Construct the endpoint and fetch the state of the instance
          const stateResponse = await fetch(`${normalizedApiUrl}/waInstance${instance.idInstance}/getWaSettings/${instance.apiTokenInstance}`);
          const stateData = await stateResponse.json();

          // Add the state to the instance object
          instance.status = stateData?.stateInstance;
          instance.apiUrl = normalizedApiUrl;
          instance.avatar = stateData?.avatar || '';
          instance.phone = stateData?.phone || '';
        } catch (error) {
          console.error(`Error fetching state for instance ${instance.idInstance}:`, error);
          instance.status = 'Error'; // Handle individual instance errors without crashing the whole process
        }
        return instance;
      })
    );
    console.log('hhh',updatedInstances);
    
    // Send the updated instances with their state
    res.status(200).send({ instances: updatedInstances });
  } catch (error) {
    console.error('Error fetching instances or their state:', error);
    res.status(500).send({ error: error.message });
  }
});

app.post('/api/qr', async (req, res) => {
  try {
    const {url,id,token} = req.body;
    const response = await fetch(`${url}/waInstance${id}/qr/${token}`);
    const qrData = await response.json();
    res.status(200).send({qrData});
  } catch (error) {
    console.error('Error fetching qr ', error);
    res.status(500).send({ error: error.message });
  }
});

app.get('/demo',(req, res) => {
  console.log("dhfgsdfgusyfgugsfjg");
  res.json({status:true})
})
//https://hook.eu1.make.com/27b99xvsq6xjjpmleulnyxjn14yn0wip

//  curl http://localhost:39413/api/demo  
//   https://3b28-103-252-170-47.ngrok-free.app/webhook                   
//   ngrok http 39413

app.post('/webhook', (req, res) => {
  const eventData = req.body;  // Capture the webhook data from the request body
  console.log('Received webhook event:', eventData);

  // Respond to acknowledge that the webhook was received
  res.status(200).send('Webhook received!');
});

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

//http://localhost:33863/webhook
//https://f667-103-252-170-47.ngrok-free.app/webhook




app.listen(PORT, () => {
  console.log(` running on http://localhost:${PORT}`);
});
