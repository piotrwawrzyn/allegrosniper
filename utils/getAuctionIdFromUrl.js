const getAuctionIdFromUrl = url => {
  const result = url.match(/-(\d+$)/);

  return result[1];
};

module.exports = getAuctionIdFromUrl;
