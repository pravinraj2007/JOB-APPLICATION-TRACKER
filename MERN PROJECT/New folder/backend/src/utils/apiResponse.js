const sendSuccess = (res, data, message = 'Operation successful', status = 200) => {
  return res.status(status).json({
    success: true,
    data,
    message,
  });
};

const sendError = (res, code, message, status = 400) => {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};

module.exports = { sendSuccess, sendError };
