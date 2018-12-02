const fs = require('fs');
const rsvp = require('rsvp');
const _ = require('lodash');
const search = require('craigslist-searcher').search;
// change the cities file below is necessary, as of now it's calling cities-test which is just a sublist of cities.txt
const cities = fs.readFileSync('./cities-test.txt', 'utf-8').split('\n');
const averages = {};

// FOR REFERENCE:
// const options = {
//   city: 'omaha',
//   query: 'toyota',
//   category: 'cta',
//   offset: 0
// }

function getPromisesByCity(query, city, offset, resultsArray) {
  const options = {
    city,
    query,
    offset,
    category: 'ata',
  };

  return search(options)
    .then(results => {
      if (results.length > 0) {
        // console.log(`pushing ${results.length} results to array for city ${options.city}`);
        resultsArray.push(...results);
        return getPromisesByCity(query, city, offset + 120, resultsArray);
      }
      return resultsArray;
    })
    .catch(err => {
      console.log(`error for city name '${options.city}'`);
    });
}

function getPromiseHashByCity(query) {
  const promises = {};

  _.each(cities, city => {
    promises[city] = getPromisesByCity(query, city, 0, []);
  });
  return promises;
}

function getPostingsByCity(query) {
  const promiseHashByCity = getPromiseHashByCity(query);

  return rsvp.hashSettled(promiseHashByCity);
}

// the above functions are the meat of searching craigslist, you can pretty much leave them as-is
// except for changing the options object if necessary;
// below are the functions that you can use or add to for specific cases of handling the results

function getAveragePriceByCity(query) {
  getPostingsByCity(query)
    .then(postingsByCity => {
      const averagePrices = {};
      const averagePricesOrdered = [];

      _.each(postingsByCity, (postings, city) => {
        if (postings.state === 'fulfilled' && postings.value !== undefined) {
          let sumOfPrices = 0;
          const numberOfPrices = postings.value.length;

          _.each(postings.value, posting => {
            const price = parseInt(posting.price.slice(1));
            sumOfPrices += price;
          });
          averagePrices[city] = Math.round((sumOfPrices / numberOfPrices));
        }
      });
      _.each(averagePrices, (ap, city) => {
        averagePricesOrdered.push(ap);
      });
      averagePricesOrdered.sort();
      console.log(averagePricesOrdered);
      console.log(averagePrices);
    });
}

function queryAllCitiesAndGetLinks(query) {
  getPostingsByCity(query)
    .then(postingsByCity => {
      const links = {};
      _.each(postingsByCity, (postings, city) => {
        if (postings.state === 'fulfilled' && postings.value !== undefined && !_.isEmpty(postings.value)) {
          _.each(postings.value, posting => {
            const link = {
              title: posting.title,
              price: posting.price,
              url: posting.url
            }
            if (links[city]) {
              links[city].push(link);
            } else {
              links[city] = [link];
            }
          });
        }
      });
      console.log(links)
    });
}

queryAllCitiesAndGetLinks('vintage posters')