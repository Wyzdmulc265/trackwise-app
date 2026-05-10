import { Client, Account, Databases } from "appwrite";

// Initialize Appwrite client using environment variables
const client = new Client()
  .setEndpoint(import.meta.env.VITE_API_URL)   // e.g. https://fra.cloud.appwrite.io/v1
  .setProject(import.meta.env.VITE_PROJECT_ID); // your Project ID

// Export commonly used services
export const account = new Account(client);
export const databases = new Databases(client);

export default client;
