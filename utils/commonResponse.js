const createSuccessResponse = (message, data) => {
  return {
    result: "success",
    message: message,
    data: data??null,
  };
};
const createErrorResponse = (message, data) => {
  return {
    result: "error",
    message: message,
    data: data??null,
  };
};

module.exports = { createSuccessResponse, createErrorResponse };