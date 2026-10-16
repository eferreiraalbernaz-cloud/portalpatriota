export default {
  fetch(request, env) {
    return env.PORTAL.fetch(request);
  }
};
