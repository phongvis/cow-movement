const fs = require('fs');
const _ = require('lodash');
const json2csv = require('json2csv');
const dsv = require('d3-dsv');

const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017/cts';

// main();
exportAnimoveData();

// function main() {
//     MongoClient.connect(url).then(db => {
//         db.collection('location').find({}).toArray().then(allHoldings => {
//             // Exclude holdings with empty post code
//             allHoldings = allHoldings.filter(d => d.PostCodeArea);

//             // To store statistics of holdings in areas
//             const pchAreaLookup = {};

//             // To store statistics of holding types
//             const pchTypeLookup = {};

//             // Ignore holdings with empty postcodes
//             const areaLookup = _.groupBy(allHoldings, 'PostCodeArea');
//             let areas = [];

//             _.each(areaLookup, (v, k) => { // Each area
//                 const area = { size: 0 };
//                 const typeLookup = _.groupBy(v, 'PremisesType');
//                 _.each(typeLookup, (holdings, type) => { // Each type
//                     if (type) {
//                         area.size += area[type] = holdings.length; // Ignore empty premise type

//                         pchTypeLookup[type] = pchTypeLookup[type] || 0;
//                         pchTypeLookup[type] += holdings.length;
//                     }
//                 });

//                 pchAreaLookup[k] = area;
//                 areas.push({ name: k, size: area.size });
//             });

//             // 198 in total but only 124 real post code areas => lots of wrong data
//             // console.log(_.size(pchAreaLookup));
//             // console.log(pchAreaLookup);

//             // No easy way to exclude wrong data. Can use predefined list of areas.
//             // areas = _.orderBy(areas, 'size', 'asc');
//             // console.log(areas);

//             // Those are the most popular ones:
//             // AH: 123689, LK: 4724, SR: 524, SG: 431, MA: 241
//             // To percentage
//             const numHoldings = _.sum(_.values(pchTypeLookup));
//             let pchTypeList = [];
//             _.each(pchTypeLookup, (v, k) => {
//                 pchTypeLookup[k] = _.round(v / numHoldings * 100, 3);
//                 pchTypeList.push({ name: k, value: pchTypeLookup[k] });
//             });
//             pchTypeList = _.orderBy(pchTypeList, 'value', 'desc');
//             // console.log(pchTypeList);

//             // List of premise types, ordering by their count
//             const pchTypeNames = pchTypeList.map(d => d.name);

//             /**
//              * Export a table showing premise types of each area
//              */
//             let areaTypeTable = [];
//             const c = { area: 'country' };
//             areaTypeTable.push(c);
//             pchTypeNames.forEach(t => {
//                 c[t] = pchTypeLookup[t];
//             });

//             // South West England: https://en.wikipedia.org/wiki/Category:Postcode_areas_covering_South_West_England
//             const selectedAreas = [ 'BA', 'BH', 'BS', 'DT', 'EX', 'GL', 'NP', 'PL', 'SN', 'SP', 'TA', 'TQ', 'TR' ];

//             _.each(pchAreaLookup, (v, k) => {
//                 const area = { area: k, '# Holdings': v.size };
//                 areaTypeTable.push(area);
//                 pchTypeNames.forEach(t => {
//                     if (v[t]) area[t] = _.round(v[t] / v.size * 100, 3);
//                 });

//                 // Mark the area if it belongs to the selected ones
//                 if (selectedAreas.includes(k)) area['South West'] = 1;
//             });

//             areaTypeTable = _.orderBy(areaTypeTable, '# Holdings', 'desc');

//             // console.log(areaTypeTable);

//             // Save to file
//             fs.writeFileSync('areaTypeTable.csv', json2csv({
//                 data: areaTypeTable,
//                 fields: [ 'area', 'South West', '# Holdings' ].concat(pchTypeNames)
//             }));

//             db.close();
//         });
//     }).catch(err => {
//         if (err) throw err;
//     });
// }

function exportAnimoveData() {
    fs.readFile('AnimalsFromGL2010movement.csv', 'UTF-8', (err, obj) => {
        const data = dsv.csvParse(obj);
        const animals = _.values(_.pickBy(_.groupBy(data, 'AnimalId'), moves => moves.length >= 10)).slice(0, 10);

        animals.forEach((moves, idx) => {
            fs.writeFileSync('cow-0' + idx + '.csv', dsv.csvFormat(moves));
        });
    });
}

// function exportAnimoveData() {
//     fs.readFile('AnimalsFromGL2010movement.csv', 'UTF-8', (err, obj) => {
//         const data = dsv.csvParse(obj);
//         const animals = _.values(_.pickBy(_.groupBy(data, 'AnimalId'), moves => moves.length >= 50));

//         animals.forEach((moves, idx) => {
//             fs.writeFileSync('cow-' + (idx + 1) + '.csv', dsv.csvFormat(moves));
//         });
//     });
// }