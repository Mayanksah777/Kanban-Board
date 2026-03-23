function hasVersionConflict(clientVersion, serverVersion) {
  return Number(clientVersion) !== Number(serverVersion);
}

module.exports = {
  hasVersionConflict
};