// node database/dbOps/import/importByStateName.js Haryana Punjab

const importPanchayats = require('./importByPanchayatId');

const states = process.argv.slice(2);
if (!states.length) {
  console.error('Usage: node importStateData.js <StateName1> [StateName2 ...]');
  process.exit(1);
}
const backupDirName = 'backup_' + states.join('_');
importPanchayats(backupDirName);