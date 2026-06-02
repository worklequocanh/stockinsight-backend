const { sendSuccess } = require('../utils/apiResponse');

function makeHandler(scope) {
  return (req, res) => {
    return sendSuccess(res, {
      scope,
      user: req.user,
    }, `${scope} access granted`);
  };
}

module.exports = {
  getAnyAccess: makeHandler('authenticated'),
  getAdminAccess: makeHandler('admin'),
  getWarehouseAccess: makeHandler('warehouse'),
  getEmployeeAccess: makeHandler('employee'),
};
