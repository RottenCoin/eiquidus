/**
 * Seed Server Plugin - local_plugin_settings.js
 * Exposes peer seed API endpoints integrated with eiquidus explorer.
 */

module.exports = {
  // public_apis: exposed on the /api page of the explorer
  public_apis: {
    ext: {
      getseeds: {
        enabled: true,
        url: '/api/seed/peers',
        api_name: 'getseeds',
        api_parameters: [],
        api_desc: 'Returns a JSON array of active network peers suitable for use as seed nodes'
      },
      getseedstext: {
        enabled: true,
        url: '/api/seed/peers.txt',
        api_name: 'getseedstext',
        api_parameters: [],
        api_desc: 'Returns a plain-text list of active peer IP:port pairs, one per line'
      }
    }
  },

  // localization strings used in api descriptions
  localization: {
    getseeds_description: 'Returns a JSON array of active network peers suitable for use as seed nodes',
    getseedstext_description: 'Returns a plain-text list of active peer IP:port pairs, one per line'
  }
};
