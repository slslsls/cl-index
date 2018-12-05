const es = require('elasticsearch');
const fs = require('fs');
const rsvp = require('rsvp');
const _ = require('lodash');
const esClient = new es.Client({
  host: 'localhost:9200',
  log: 'error'
});
const search = require('craigslist-searcher').search;
// change the cities file below is necessary, as of now it's calling cities-test which is just a sublist of cities.txt
// const cities = fs.readFileSync('./cl-subdomains-test.txt', 'utf-8').split('\n');
const subdomains = JSON.parse(fs.readFileSync('./cl-subdomains-test.json', 'utf-8'));

// FOR REFERENCE:
// const options = {
//   city: 'omaha',
//   query: 'toyota',
//   category: 'cta',
//   offset: 0
// }

function decodeEntities(encodedString) {
    var entityRegex = /&(nbsp|amp|quot|lt|gt);/g;
    var entityTranslations = {
        "nbsp": " ",
        "amp" : "&",
        "quot": "\"",
        "lt"  : "<",
        "gt"  : ">"
    };
    return encodedString.replace(entityRegex, function(match, entity) {
        return entityTranslations[entity];
    }).replace(/&#(\d+);/gi, function(match, numStr) {
        var num = parseInt(numStr, 10);
        return String.fromCharCode(num);
    });
}

function getPromisesByCity(city, offset, resultsArray) {
  const options = {
    city,
    offset,
    category: 'sss'
  };

  return search(options)
    .then(results => {
      if (results.length > 0) {
        // console.log(`pushing ${results.length} results to array for city ${options.city}`);
        resultsArray.push(...results);
        return getPromisesByCity(city, offset + 120, resultsArray);
      }
      return resultsArray;
    })
    .catch(err => {
      console.log(`error for city name '${options.city}'`);
    });
}

function getPromiseHashByCity() {
  const promises = {};
  _.each(subdomains, (info, subdomain) => {
    promises[subdomain] = getPromisesByCity(subdomain, 0, []);
  });
  return promises;
}

function getAllPostingsByCity() {
  const promiseHashByCity = getPromiseHashByCity();

  return rsvp.hashSettled(promiseHashByCity);
}

function indexEsDocuments(esDocs) {
  esClient.indices.delete({ index: 'listings' }, (err, res) => {
    if (!err) {
      const mappingsAndSettings = JSON.parse(fs.readFileSync('./listings.json', 'utf-8'));
      esClient.indices.create({ index: 'listings', body: mappingsAndSettings }, (err, res) => {
        if (!err) {
          const bulkOptions = {
            body: esDocs,
            refresh: 'true'
          };
          console.log('hi')
          esClient.bulk(bulkOptions);
        }
      });
    }
  });
}

function fetchAndIndexPostings() {
  const esDocs = [];
  getAllPostingsByCity()
    .then(postingsBySubdomain => {
      _.each(postingsBySubdomain, (postings, subdomain) => {
        if (postings.state === 'fulfilled' && postings.value !== undefined && !_.isEmpty(postings.value)) {
          const { city, location } = subdomains[subdomain];
          _.each(postings.value, posting => {
            const esDocument = {
              city,
              location,
              price: parseInt(posting.price.slice(1)),
              subdomain,
              title: posting.title,
              url: posting.url
            };
            console.log(`queueing document: subdomain '${subdomain}', title '${posting.title}'`);
            esDocs.push({ index:  { _index: 'listings', _type: '_doc'} });
            esDocs.push(esDocument);
          });
        }
      });
      indexEsDocuments(esDocs);
    });
}

fetchAndIndexPostings()


// fix ascii (or html entities) in posting titles; either fix or remove the decodeEntities function above that you got from Stack Overflow
// tests