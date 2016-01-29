/*
* Emerging technologies - Session 2015
* Paris Dauphine
*
* WARNING : console.log is used in this example to follow-up progression. Though, It is not a best practice for production apps :-) !
*/
/*
express is required along with some iddlewares
- express-session for the Session management
- body-parser in order to parse the bdo of the pages (as json)
*/

var express = require('express');
//var session = require("express-session");
var bodyParser = require('body-parser');

//Creates an Express application
var app = express();
// Express usage of Static file - css , image
app.use(express.static('./public'));
//Session pour stocker les donnée
var mysession = [];
//Enable the parser in order to interpret the POST to retrieve data
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());

////////////////////////////////////////////////////////////////////////////////
//CLOUDANT
var Cloudant = require('cloudant');

var me = "724b53f0-5f45-4a34-8a8b-8c4f4f13f5c2-bluemix"; // Set this to your own account
var password = "70588e4e7abcf9533f43ce2d29f5de7517357d3dee455e3890abff1686554354";// Set this to your own account
var cloudant = Cloudant({account:me, password:password});

//Watson translation

var watson = require('watson-developer-cloud');

var language_translation = watson.language_translation({
  username: '2720088f-31e8-4593-9c1b-308b5124aa6a',
  password: 'I3QnOSIB4DDn',
  version: 'v2'
});

//Personality Insights:
var personality_insights = watson.personality_insights({
  username: '9b82400a-32de-432b-9cdf-a7114b41b82e',
  password: 'YXvGj3qHXMMe',
  version: 'v2'
});

//Text To Speech
var fs = require('fs');
var text_to_speech = watson.text_to_speech({
  username: '790eef5f-cd97-4e01-82ee-eb9b1433369f',
  password: 'f9Azxcys0kNv',
  version: 'v1'
});

//PRE Requisite : The Cloudant database mybooks should be created in CLOUDANT
// Remark : Work is done on the remote database. No replication enabled.
var mybooksdb = cloudant.use('mybooks');


var thebookslist=[];
var currentBook;
var childrenPercentage = [];
var categoryNames = [];
var frenchSummary = "";
var personnalityInsights;

mybooksdb.find({selector:{type:"book"}}, function(er, result) {
  if (er) {    throw er;  }
  thebookslist=result.docs;
  //console.log('Found %d books in documents', result.docs.length);
});

////////////////////////////////////////////////////////////////////////////////
//EXPRESS Routes definition
app.get('/', function (req, res) {
  // The collection of books is computed to rely on fresh data
  res.render('./pages/index.ejs');
});
//Express Route : GET at the root page. Display the Booklist and Book creation page
app.get('/book', function (req, res) {
  // The collection of books is computed to rely on fresh data
  mybooksdb.find({selector:{type:"book"}}, function(er, result) {
    if (er) { throw er; }
    thebookslist=result.docs;
    console.log('OPEN main page with %d books', result.docs.length);
    res.render('./pages/mainpage.ejs',{ booklist: thebookslist});
  });
});
//Express Route : POST to add a book to the collection
app.post('/book/add/', function(req, res) {
  mybooksdb.insert(req.body);
  console.log ('Book added');
  setTimeout(function() {
    res.redirect('/book');
  }, 600);
});

//Express Route : GET to remove a book from a collection the collection : ID and revision are required
app.get('/book/remove/:id/:rev', function(req, res) {
  if (req.params.id != '') {
    mybooksdb.destroy(req.params.id,req.params.rev)
    console.log ('Book removed');
    setTimeout(function() {
      res.redirect('/book');
    }, 600);
  };
});

//Express Route : GET to open the details of a book
//Remark: For the example the data are retrieved from the database to demonstrate the "get" on ID primitive
app.get('/book/open/:id', function(req, res) {
  mybooksdb.get(req.params.id, { include_doc: true }, function(err, body) {
    if (!err){
      res.render('./pages/bookdetails.ejs',{ booklist: body});
      currentBook = body;
      console.log ('OPEN Book details');
    }
    else {  res.redirect('/');}
  });
});

app.get('/book/personality_insights/:id', function(req, resp) {
  /*childrenPercentage and Category names are used to show personality and percentages*/
  
  if (req.params.id != '') {
    
    personality_insights.profile({
      text: currentBook.booksummary,
      language: 'en' },
      function (err, response) {
        if (err)
          console.log('error:', err);
        else{
          for(var i = 0; i < 5; i++) {
            var obj = JSON.stringify(response.tree.children[0].children[0].children[i].percentage, null, 2);
            var category = JSON.stringify(response.tree.children[0].children[0].children[i].name, null, 2);
            childrenPercentage[i] = obj;
            categoryNames[i] = category; 
          }
          resp.render('./pages/personality_insights.ejs',{percentages: childrenPercentage, categories: categoryNames});
        }
    });
  };
});
app.get('/book/translation/:id', function(req, resp) {
  /*childrenPercentage and Category names are used to show personality and percentages*/
  
  if (req.params.id != '') {
    language_translation.translate({
    text: currentBook.booksummary, source : 'en', target: 'fr' },
      function (err, translation) {
        if (err)
          console.log('error:', err);
        else{
          var myTranslation = translation.translations[0].translation;
          resp.render('./pages/translation.ejs',{translation: myTranslation});
        }
          

    });
  };
});

/*Visual recognition*/
var visual_recognition = watson.visual_recognition({
  username: '1920fd6d-9173-41b6-8f88-e9cd72adfc4f',
  password: 'v7EoAgqGK90L',
  version: 'v2-beta',
  version_date: '2015-12-02'
});
app.get('/visual_recognition', function (req, res) {
  // The collection of books is computed to rely on fresh data
  res.render('./pages/visual_recognition.ejs');
});
var visual_analysis;
app.post('/visual_recognition/analyze_image1', function(req, resp) {
  var visual_analysis = [];
  var params = {
    images_file: fs.createReadStream('./images/house.jpg')
  };
  visual_recognition.classify(params, function(err, res) {
    if (err)
      console.log(err);
    else{
      visual_analysis = res.images[0].scores;
      resp.render('./pages/visual_recognition_analysis.ejs',{analysis: visual_analysis});
    }
  });
});

app.post('/visual_recognition/analyze_image2', function(req, resp) {
  var visual_analysis = [];
  var params = {
    images_file: fs.createReadStream('./images/audi.jpg')
  };
  visual_recognition.classify(params, function(err, res) {
    if (err)
      console.log(err);
   else{
    visual_analysis = res.images[0].scores;
    resp.render('./pages/visual_recognition_analysis.ejs',{analysis: visual_analysis});
   }
  });
});

//Fallback by default : the page can not be opened !
app.use(function (req,res,next){
  res.status(404);
  res.send('404! File not found');
});

// Defining the Server - Please note the 'cloud enabled' variable
var host = process.env.VCAP_APP_HOST || process.env.HOST || 'localhost';
var port = process.env.VCAP_APP_PORT || process.env.PORT || 8090;
var server = app.listen(port, host);

console.log('*******************************************************************');
console.log('**    Paris Dauphine 2015 - Emerging technologies');
console.log('**    Server ready for business at http://%s:%s', host, port);
console.log('*******************************************************************');
