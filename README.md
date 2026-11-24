# Express API Demo
## ❓What is this Repository about?
This repository contains demo users app developed to server the automation purpose for my other repositories

## ⌘ Getting Started
**Prerequisite**
- setup node: [Windows][1] | [Ubuntu][2] | [macOS][3]

**Setup**
- open a terminal in the root of the repository and install the dependencies

    **```npm install```**
- start the app:
  
    **```npm start```**
    

  
**NOTE**: To know more about this demo api, start the app and then read the [swagger-api-docs][4]

## 🔑 Authentication
- Get an API key from `POST /api/login` with a username and password, then send it in the `x-api-key` header.
- The key is required for every `/api/users` endpoint **and for GraphQL** at `/graphql`. In the GraphQL explorer, add it under *Headers*.
- Login keys expire after 24 hours and are cleared when the server restarts. `POST /api/logout` revokes a key straight away.
- Passwords can be set but are never returned by the REST API or GraphQL.

## 🗂️ Data
- The users live in `data/data.json`, which the app creates from `data/data-backup.json` on startup if it is missing.
- `data/data.json` is not tracked in git, so adding, editing or deleting users does not change your working tree.
- `PUT /api/users/reset-data` (or the *Reset data* button in the UI) restores the backup.
- The `admin` (id 0) and `srinivasaimandi` (id 3) users cannot be edited or deleted.








[1]:https://www.geeksforgeeks.org/install-node-js-on-windows/
[2]:https://www.geeksforgeeks.org/installation-of-node-js-on-linux/
[3]:https://www.geeksforgeeks.org/how-to-install-nodejs-on-macos/
[4]:http://localhost:9899/api-docs/
