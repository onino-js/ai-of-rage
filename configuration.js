export const configuration = (mock) => ({
  api_url: "http://localhost:3000",
  init: configuration.api_url + "/fight/init" + mock,
  next: configuration.api_url + "/fight/next" + mock,
  end: configuration.api_url + "/fight/end" + mock,
});
