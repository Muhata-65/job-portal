# Goodwork Job Portal

A responsive job board built with React, JavaScript, Bootstrap 5, and React Router. Listings load from the Arbeitnow job-board API, with sample listings as an offline fallback.

## Run locally

```sh
npm install
npm run dev
```

Run `npm run lint` for lint checks and `npm run build` for the production bundle in `dist/`.

## Features

- Search by role, skill, company, and location; filter by location, remote work, job type, and category.
- Paginated listings, routed job details, and saved jobs persisted in browser storage.
- A validated application form. Applications are stored locally for this demo and are not sent to employers.
- Loading, API fallback, empty-results, and not-found states.

## Publish

Import the repository into Vercel or Netlify with `npm run build` as the build command and `dist` as the output directory. `public/_redirects` enables client-side routes on Netlify.

To push to GitHub, create an empty repository, then run `git init`, `git add .`, `git commit -m "Build Goodwork job portal"`, and add your repository as `origin` before pushing `main`.

