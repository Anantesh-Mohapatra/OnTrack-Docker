# Welcome to OnTrack\!

# Project Description

OnTrack makes it easier to find information about a train, using its train number. Since NJTransit’s app can often be slow and confusing to use, OnTrack’s simple interface makes it easy to see where a train is, how delayed it is, and more\!  
OnTrack also uses a complex machine learning, neural-network algorithm to determine the most popular trains, and the top 4 trains are shown on the top of the site.  
*Disclaimer: “Popular” trains are actually just manually selected by me, and are not found through an algorithm.*

# Instructions

0. Please install the prerequisites for the project.  
   1. **Node.js**  
   2. **npm**  
1. Clone the repository to your local machine, using ```git clone [https://github.com/Anantesh-Mohapatra/OnTrack](https://github.com/Anantesh-Mohapatra/OnTrack.git)```.  
2. You can make sure any other dependencies are installed by running \`\`\`npm install\`\`\` in your terminal.  
3. Create a .env file in the project folder and add your API key there (more information in the next section).  
   1. Your .env file should look like this: ```REACT\_APP\_NJTRANSIT\_API\_KEY=your\_api\_key\_here```  
4. Launch the site by running ```npm start``` in your terminal. The site should automatically open\!

# API Information

This project uses the free NJTransit API. API keys from NJTransit for this particular purpose can be generated up to 10 times a day, and each key can be used up to 40,000 times a day.  
To register for a key and read the API docs, please visit [NJTransit’s developer portal](https://developer.njtransit.com/registration/docs).  
*Note: NJTransit requests that developers use the test environment first, and to refrain from developing in the production environment. More information about this can be found in the RailData API documentation.*

# Credit

Portions of this project were developed with the assistance of AI-generated code from OpenAI's ChatGPT.  
Specifically, AI was used to:

* Generate the initial structure of React components, including `TrainStatus.js` and `PopularTrains.js`.  
* Assist with logic implementation for handling API responses, state management, and conditional rendering.  
* Provide guidance on JSX structure, event handling, and styling.

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.  
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.  
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.  
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.  
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.  
Your app is ready to be deployed\!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back\!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting\#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)  