# Welcome to OnTrack\!

# Project Description

OnTrack makes it easier to find information about a train, using its train number. Since NJTransit’s app can often be slow and confusing to use, OnTrack’s simple interface makes it easy to see where a train is, how delayed it is, and more\!  
OnTrack also uses a complex machine learning, neural-network algorithm to determine the most popular trains, and the top 4 trains are shown on the top of the site.  
*Disclaimer: “Popular” trains are actually just manually selected by me, and are not found through an algorithm.*

# Instructions

0. Please install the prerequisites for the project.  
   1. **Node.js**  
   2. **npm**  
1. Clone the repository to your local machine, using `git clone https://github.com/Anantesh-Mohapatra/OnTrack.git`.  
2. Use `npm install` to install all necessary modules.  
3. Create a .env file in the project folder and add your API key there (more information in the next section).  
   1. Your .env file should look like this: `REACT\_APP\_NJTRANSIT\_API\_KEY=your\_api\_key\_here`  
4. Launch the site by running `npm start` in your terminal. The site should automatically open\!

# API Information

This project uses the free NJTransit API. API keys from NJTransit for this particular purpose can be generated up to 10 times a day, and each key can be used up to 40,000 times a day.  
To register for a key and read the API docs, please visit [NJTransit’s developer portal](https://developer.njtransit.com/registration/docs).  
*Note: NJTransit requests that developers use the test environment first, and to refrain from developing in the production environment. More information about this can be found in the RailData API documentation.*