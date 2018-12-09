const fs = require('fs');
const subdomains = fs.readFileSync('../cl-subdomains.txt', 'utf-8').split('\n');
const detailedCities = JSON.parse(fs.readFileSync('../cities-full.json', 'utf-8'));

function removeSpacesFromString(str) {
  return str.replace(/\s/g, '');
}

function findCityAndGetDetails(subdomain) {
  let cityDetail = null;
  detailedCities.forEach(city => {
    const compactCityName = removeSpacesFromString(city.city).toLowerCase();
    if (subdomain == compactCityName) {
      cityDetail = city;
    }
  });
  if (cityDetail == null) console.log(`missed subdomain: ${subdomain}`);
  return cityDetail;
}

function mapCityDetailsToSubdomains() {
  const detailedCities = {};
  subdomains.forEach(subdomain => {
    const cityDetails = findCityAndGetDetails(subdomain);
    let cityObject;
    if (cityDetails != null) {
      cityObject = {
        city: `${cityDetails.city}, ${cityDetails.state}`,
        location: {
          lat: cityDetails.latitude,
          lon: cityDetails.longitude
        }
      };
    } else {
      cityObject = {
        city: '',
        location: {
          lat: 0,
          lon: 0
        }
      };
    }
    detailedCities[subdomain] = cityObject;
  });
  // fs.writeFile('./testing-cities-script.json', JSON.stringify(detailedCities, null, 2), err => {
  //   if (err) {
  //     console.log(err);
  //   }
  // });
}

mapCityDetailsToSubdomains()