const request = require('postman-request');
const base_url = 'https://qutrade.io/api/v1/';
const market_url_template = 'https://qutrade.io/en/?market={coin}_{base}';

// initialize the rate limiter to wait 2 seconds between requests to prevent abusing external apis
const rateLimitLib = require('../ratelimit');
const rateLimit = new rateLimitLib.RateLimit(1, 2000, false);

function get_summary(coin, exchange, api_error_msg, cb) {
  const req_url = base_url + 'market_data/';

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.result == null || body.result !== 'success')
        return cb(api_error_msg, null);
      else {
        try {
          const pair_key = coin.toLowerCase() + '_' + exchange.toLowerCase();
          const pair_data = body.list[pair_key];

          if (pair_data == null)
            return cb(api_error_msg, null);

          const summary = {
            'high': parseFloat(pair_data.high) || 0,
            'low': parseFloat(pair_data.low) || 0,
            'volume': parseFloat(pair_data.asset_1_volume) || 0,
            'volume_btc': parseFloat(pair_data.asset_2_volume) || 0,
            'bid': parseFloat(pair_data.bid) || 0,
            'ask': parseFloat(pair_data.ask) || 0,
            'last': parseFloat(pair_data.price) || 0,
            'change': parseFloat(pair_data.trend) || 0
          };

          return cb(null, summary);
        } catch(err) {
          return cb(api_error_msg, null);
        }
      }
    });
  });
}

function get_trades(coin, exchange, api_error_msg, cb) {
  const pair_key = coin.toLowerCase() + '_' + exchange.toLowerCase();
  const req_url = base_url + 'market_trades/?pair=' + pair_key + '&limit=50';

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.result == null || body.result !== 'success')
        return cb(api_error_msg, null);
      else {
        try {
          let trades = [];

          for (let t = 0; t < body.list.length; t++) {
            // filter trades for this specific pair
            if (body.list[t].pair === pair_key) {
              trades.push({
                ordertype: body.list[t].side.toUpperCase(),
                price: parseFloat(body.list[t].price) || 0,
                quantity: parseFloat(body.list[t].amount) || 0,
                timestamp: parseInt(body.list[t].timestamp)
              });
            }
          }

          return cb(null, trades);
        } catch(err) {
          return cb(api_error_msg, null);
        }
      }
    });
  });
}

function get_orders(coin, exchange, api_error_msg, cb) {
  const pair_key = coin.toLowerCase() + '_' + exchange.toLowerCase();
  const req_url = base_url + 'market_depth/?market=' + pair_key;

  // NOTE: no need to pause here because this is the first api call
  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null, null);
    else if (body == null || body == '' || typeof body !== 'object')
      return cb(api_error_msg, null, null);
    else if (body.result == null || body.result !== 'success')
      return cb(api_error_msg, null, null);
    else {
      try {
        let buys = [];
        let sells = [];
        const pair_data = body.list[pair_key];

        if (pair_data == null)
          return cb(api_error_msg, null, null);

        if (pair_data.bids != null) {
          for (let b = 0; b < pair_data.bids.length; b++) {
            buys.push({
              price: parseFloat(pair_data.bids[b][0]) || 0,
              quantity: parseFloat(pair_data.bids[b][1]) || 0
            });
          }
        }

        if (pair_data.asks != null) {
          for (let s = 0; s < pair_data.asks.length; s++) {
            sells.push({
              price: parseFloat(pair_data.asks[s][0]) || 0,
              quantity: parseFloat(pair_data.asks[s][1]) || 0
            });
          }
        }

        return cb(null, buys, sells);
      } catch(err) {
        return cb(api_error_msg, null, null);
      }
    }
  });
}

module.exports = {
  market_name: 'Qutrade',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADKElEQVR4nG2TX2hTZxjGn/c7yUnOnzS2NfMPdgy2uekQtbGdWl33x6JTpjL4dqHT2RZSsBStnVAoNAi7UJdNdOzCYqQw7MU+UC+22bU6FGtWZGWywkR0u1nXVcfa7DQnOUlzzrcL19AW37sX3ufH+/I+D2FhSVC057xvZHzc3fzH+FXm80cmp/5u+FWIDOdcEUK4c8dpoRgEOdtubG6p8yvKd1LSvcn0k13PgrCSOB5nIEjEY7qZ7O7SPz9ePZw8fyeXc94EobqiPDL4yu7dISGEyzlX5gPicYYTJzx0fGiYyyPfUMj8hHT1ZujMx5t++uriz7bj1BGw+rllVYNRzsNzIQQOFcjhIh4TjRVLvicg6hVye0kJHIVfqUE2z+22Uzej+w6t0U19CKAH2aknDSNC/Ms5VxiEcPFph2FULR0govWu47yRbU0MFDK5LqZri8FYZ319fW+kr3c0m8luAfCSVhG5vnbPnkVCCJdwtq3M0MLXSPGt86xMXbY9cU9NHHtVLTdvAPjTzTjv546cHpu9+fUDB1b59VAKHn7LO7TdZ/jNHwi0omBlNxTaE/e1LztrWDDYD3hjciL9Xq7r3OMo52GtPJL0isWe1MWegQ37GqMBI3jLr7q3GBEFQCiS4joAQBKVIKQyUxPv2F3nHq/mzRVaeWSQQDuIeRYASJ9LRABBSsIXnZVG0N8Pxl6csdJ1hfaz90vrNjcv8VPgMim0cmbafnu4r3e05uDB14JaaEh68lHRy29naDv5jz1mNQDyd7UsPGR81r7m/9f6FKlcUHVtc9Zydg339Y7WNjauDQZDt6XEw1y6uG04mZwkfM0VfCBcnIyFzcjS6xL0MtLWVrvjzGhtLPaWCkV4rne36OYTqk+7AsYeFOz0truXLlmcc+WplUte+GiRUfVCP+CtQia31T6a+KWmqWmTytT+gGGW5TPTKcea3Dnrgfm5mLXn8aaQcaH7RyPZPa0njq0HgI2HYtVbWlq7a/fvL3t6XbwUgflhKm1y2DSeX/wtpFzH8vl3p1tPpxYEUD4bsBBSVXkDM8Upe0LdGf1ruTLS0+IC8OaO/wc0GFgnEV1LwgAAAABJRU5ErkJggg==',
  market_url_template: market_url_template,
  market_url_case: 'l',
  get_data: function(settings, cb) {
    get_orders(settings.coin, settings.exchange, settings.api_error_msg, function(order_error, buys, sells) {
      if (order_error == null) {
        get_trades(settings.coin, settings.exchange, settings.api_error_msg, function(trade_error, trades) {
          if (trade_error == null) {
            get_summary(settings.coin, settings.exchange, settings.api_error_msg, function(summary_error, stats) {
              if (summary_error == null) {
                // qutrade api does not provide OHLCV chart data
                return cb(null, {buys: buys, sells: sells, trades: trades, stats: stats, chartdata: []});
              } else
                return cb(summary_error, null);
            });
          } else
            return cb(trade_error, null);
        });
      } else
        return cb(order_error, null);
    });
  }
};
