# Meetbot

## Overview

A Slack app to help volunteers create, manage, and view projects and meetings.

## Tech Stack

- [MongoDB](https://github.com/mongodb/node-mongodb-native)
- [NextJS](https://nextjs.org/)
- [PlanetScale](https://planetscale.com/)
- [Prisma](https://www.prisma.io/)
- [Slack Bolt](https://slack.dev/bolt-js/tutorial/getting-started)
- [TypeScript](https://www.typescriptlang.org/)

## Database Schema

![schema](/prisma/ERD.svg)

## Getting Started

Once you've [forked](https://github.com/tmshkr/meetbot/fork) the repository,
clone it to your local machine and install the dependencies:

```
git clone https://github.com/YOUR_USERNAME/meetbot.git
cd meetbot && npm install
```

### Create your `.env` file

To create your `.env` file, copy it from `.env.example`:

```
cp .env.example .env
```

### Provision your databases

You'll need a MySQL-compatible database, so you can either run one locally
or use a service like [PlanetScale](https://planetscale.com/).

Provide your connection string starting with `mysql://` as the `DATABASE_URL` in your `.env`.

You'll also need a MongoDB instance for task scheduling with [Agenda](https://github.com/agenda/agenda) and other document data storage.

[MongoDB Cloud](https://www.mongodb.com/cloud) or a local MongoDB server
can be used to provide your `MONGO_URI` connection string.

### HTTPS dev server

Slack requires the sign-in redirect URL to be served over HTTPS,
so you can generate your own self-signed certificate with the following command:

```
cd apps/web
openssl req -x509 -out localhost.crt -keyout localhost.key \
  -days 365 \
  -newkey rsa:2048 -nodes -sha256 \
  -subj '/CN=localhost' -extensions EXT -config <( \
   printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
```

You can follow the directions in this [Medium article](https://medium.com/@greg.farrow1/nextjs-https-for-a-local-dev-server-98bb441eabd7) to trust the certificate on your local machine.

### Create a Slack app

Go to [Your Apps](https://api.slack.com/apps) and click **Create New App**.

In the **Create an app** modal that appears, select **From an app manifest**.

Select the workspace you want to develop your app in, and then provide the [app manifest](./apps/slackbot/app-manifest.yaml).

> Be sure to replace `YOUR-NAME` with your name so that we can tell who the app belongs to.

Review the summary and click **Create**.

### Slack app setup

On the **Basic Information** page for your app, click **Install to Workspace**.

Under the **App Credentials** heading, you can get the following environment variables:

- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_SIGNING_SECRET`

Under the **App-Level Tokens** heading, you'll need to create a token to run in [socket mode](https://api.slack.com/apis/connections/socket). Click **Generate Token and Scopes** then give the token any name, and make sure to give it the `connections:write` scope.

Copy and paste the token starting with `xapp` as the `SLACK_APP_TOKEN` in your `.env`.

To get the `SLACK_BOT_TOKEN`, click **OAuth & Permissions** from the sidebar under the **Features** heading.
On that page, you'll find the **Bot User OAuth Token** starting with `xoxb`.

### Google Calendar integration

The app supports two-way syncing using the [Calendar API](https://developers.google.com/calendar/api). If you're new to the Calendar API, you might want to start with the [Node.js quickstart](https://developers.google.com/calendar/api/quickstart/nodejs).

To get the necessary environment variables for the app, follow the steps below:

1. Make sure the [Calendar API is enabled](https://console.cloud.google.com/marketplace/product/google/calendar-json.googleapis.com) in your Google Cloud project.
2. Create a [service account](https://developers.google.com/identity/protocols/oauth2/service-account#creatinganaccount) in the [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts). The key type should be `JSON`.
3. The service account will have an email address associated with it. Add that email address to your [Google Calendar's sharing settings](https://support.google.com/calendar/answer/37082) as a "Make changes to events" user.
4. Paste the JSON key you downloaded in step 2 into your `.env` as the `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` variable.

### Migrate and seed the database

Before you can use the database, you'll need to push the schema to your database and seed the database with users from Slack:

```
npx prisma db push
npx prisma db seed
```

As you make changes to the database, you can see the live data using [Prisma Studio](https://www.prisma.io/studio):

```
npx prisma studio
```

### Start the dev server

Start the dev server with the following command:

```
npm run dev
```

You should now be able to use the app in your workspace.

Find it in the **Apps** sidebar and go to the Home tab to see your app's homepage.
