var map;
define([
    "dojo/_base/declare", "dojo/_base/lang", "dojo/json", "dojo/_base/array",
    "dojo/dom-construct", "dojo/dom", "dojo/on", "dojo/dom-style",
    "dojo/dom-attr", "dojo/dom-class", 
    "esri/arcgis/utils",
    "esri/dijit/LayerList", "application/ShareDialog", 
    "application/Drawer", "application/DrawerMenu",
    "application/SearchSources",
    "esri/graphicsUtils",
    "application/About", "config/sea-ice-extents-september", 
    "dijit/registry",
    "dojo/text!config/home.html"
],
  function (
    declare, lang, JSON, array,
    domConstruct, dom, on, domStyle,
    domAttr, domClass, 
    arcgisUtils,
    LayerList, ShareDialog, 
    Drawer, DrawerMenu, 
    SearchSources,
    graphicsUtils,
    About, extents,
    registry, homeTemplate
  ) {
    return declare("", [About], {
      config: {},
      constructor: function () {
        // css classes
        this.css = {
          toggleBlue: 'toggle-grey',
          toggleBlueOn: 'toggle-grey-on',
          panelPadding: "panel-padding",
          panelContainer: "panel-container",
          panelHeader: "panel-header",
          panelSection: "panel-section",
          panelSummary: "panel-summary",
          panelDescription: "panel-description",
          panelModified: "panel-modified-date",
          panelViews: "panel-views-count",
          panelMoreInfo: "panel-more-info",
          pointerEvents: "pointer-events",
          iconRight: "icon-right",
          iconList: "icon-list",
          iconLayers: "icon-layers",
          iconAbout: "icon-info-circled-1",
          iconText: "icon-text",
          appLoading: "app-loading",
          appError: "app-error"
        };
        // pointer event support
        if (this._pointerEventsSupport()) {
          domClass.add(document.documentElement, this.css.pointerEvents);
        }
        // mobile size switch domClass
        this._showDrawerSize = 850;
      },
      startup: function (config) {
        // config will contain application and user defined info for the template such as i18n strings, the web map id
        // and application id
        // any url parameters and any application specific configuration information.
        if (config) {
          //config will contain application and user defined info for the template such as i18n strings, the web map id
          // and application id
          // any url parameters and any application specific configuration information.
          this.config = config;
          // drawer
          this._drawer = new Drawer({
            showDrawerSize: this._showDrawerSize,
            borderContainer: 'bc_outer',
            contentPaneCenter: 'cp_outer_center',
            contentPaneSide: 'cp_outer_left',
            toggleButton: 'hamburger_button'
          });
          // startup drawer
          this._drawer.startup();
          //supply either the webmap id or, if available, the item info 
          var itemInfo = this.config.itemInfo || this.config.webmap;
          this._createWebMap(itemInfo);
        } else {
          var error = new Error("Main:: Config is not defined");
          this.reportError(error);
        }
      },
      reportError: function (error) {
        // remove spinner
        this._hideLoadingIndicator();
        // add app error
        domClass.add(document.body, this.css.appError);
        // set message
        var node = dom.byId('error_message');
        if (node) {
          if (this.config && this.config.i18n) {
            node.innerHTML = this.config.i18n.map.error + ": " + error.message;
          } else {
            node.innerHTML = "Unable to create map: " + error.message;
          }
        }
      },
      // if pointer events are supported
      _pointerEventsSupport: function () {
        var element = document.createElement('x');
        element.style.cssText = 'pointer-events:auto';
        return element.style.pointerEvents === 'auto';
      },
      _initTOC: function () {
        // layers
        var tocNode = dom.byId('LayerList'),
          socialTocNode, tocLayers, socialTocLayers, toc, socialToc;
        if (tocNode) {
          tocLayers = this.layers;
          toc = new LayerList({
            map: this.map,
            layers: tocLayers
          }, tocNode);
          toc.startup();
        }
      },
      _init: function () {
        // menu panels
        this.drawerMenus = [];
        var content, menuObj;
        // map panel enabled
        if (this.config.enableAboutPanel) {
          content = '';
          content += '<div class="' + this.css.panelContainer + '">';
          // if summary enabled
          if (this.config.enableSummaryInfo) {
            content += '<div class="' + this.css.panelHeader + '">' + this.config.title + '</div>';
            content += '<div class="' + this.css.panelSummary + '" id="summary"></div>';
            if (this.config.enableModifiedDate) {
              content += '<div class="' + this.css.panelModified + '" id="date_modified"></div>';
            }
            if (this.config.enableViewsCount) {
              content += '<div class="' + this.css.panelViews + '" id="views_count"></div>';
            }
            if (this.config.enableMoreInfo) {
              content += '<div class="' + this.css.panelMoreInfo + '" id="more_info_link"></div>';
            }
          }
          // show notes layer and has one of required things for getting notes layer
          if (this.config.notesLayer && this.config.notesLayer.id) {
            content += '<div id="map_notes_section">';
            content += '<div class="' + this.css.panelHeader + '"><span id="map_notes_title">' + this.config.i18n.general.featured + '</span></div>';
            content += '<div class="' + this.css.panelSection + '" id="map_notes"></div>';
            content += '</div>';
          }
          content += '</div>';
          // menu info
          menuObj = {
            title: this.config.i18n.general.about,
            label: '<div class="' + this.css.iconAbout + '"></div><div class="' + this.css.iconText + '">' + this.config.i18n.general.about + '</div>',
            content: content
          };
          // map menu
          if (this.config.defaultPanel === 'about') {
            this.drawerMenus.splice(0, 0, menuObj);
          } else {
            this.drawerMenus.push(menuObj);
          }
        }
        if (this.config.enableLegendPanel) {
          content = '';
          content += '<div class="' + this.css.panelHeader + '">' + homeTemplate + '</div>';
          content += '<div class="' + this.css.panelContainer + '">';
          content += '<div class="' + this.css.panelPadding + '">';
          content += '<div id="twitter_legend_auth"></div>';
          content += '<div id="LegendDiv"></div>';
          content += '</div>';
          content += '</div>';
          // menu info
          menuObj = {
            title: this.config.i18n.general.legend,
            label: '<div class="' + this.css.iconList + '"></div><div class="' + this.css.iconText + '">Home</div>',
            content: content
          };
          // legend menu
          if (this.config.defaultPanel === 'legend') {
            this.drawerMenus.splice(0, 0, menuObj);
          } else {
            this.drawerMenus.push(menuObj);
          }
        }
        // Layers Panel
        // if (this.config.enableLayersPanel) {
        //   content = '';
        //   content += '<div class="' + this.css.panelHeader + '">' + this.config.i18n.general.layers + '</div>';
        //   content += '<div class="' + this.css.panelContainer + '">';
        //   content += '<div id="LayerList"></div>';
        //   content += '</div>';
        //   content += '<div id="social_media_layers"></div>';
        //   // menu info
        //   menuObj = {
        //     title: this.config.i18n.general.layers,
        //     label: '<div class="' + this.css.iconLayers + '"></div><div class="' + this.css.iconText + '">' + this.config.i18n.general.layers + '</div>',
        //     content: content
        //   };
        //   // layers menu
        //   if (this.config.defaultPanel === 'layers') {
        //     this.drawerMenus.splice(0, 0, menuObj);
        //   } else {
        //     this.drawerMenus.push(menuObj);
        //   }
        // }
        // menus
        this._drawerMenu = new DrawerMenu({
          menus: this.drawerMenus
        }, dom.byId("drawer_menus"));
        this._drawerMenu.startup();
        // share dialog
        if (this.config.enableShareDialog) {
          this._ShareDialog = new ShareDialog({
            theme: this.css.iconRight,
            bitlyLogin: this.config.bitlyLogin,
            bitlyKey: this.config.bitlyKey,
            map: this.map,
            image: this.config.sharinghost + '/sharing/rest/content/items/' + this.item.id + '/info/' + this.item.thumbnail,
            title: this.config.title,
            summary: this.item.snippet,
            hashtags: 'esriPIM'
          }, 'ShareDialog');
          this._ShareDialog.startup();
        }
        // startup map panel
        this.initAboutPanel();
        // startup toc
        this._initTOC();
        // on body click containing underlay class
        on(document.body, '.dijitDialogUnderlay:click', function () {
          // get all dialogs
          var filtered = array.filter(registry.toArray(), function (w) {
            return w && w.declaredClass == "dijit.Dialog";
          });
          // hide all dialogs
          array.forEach(filtered, function (w) {
            w.hide();
          });
        });
        // hide loading div
        this._hideLoadingIndicator();

        // dialog modal
        if (this.config.enableDialogModal) {
          require(["dijit/Dialog"], lang.hitch(this, function (Dialog) {
            var dialogContent = this.config.dialogModalContent;
            var dialogModal = new Dialog({
              title: this.config.dialogModalTitle || "Access and Use Constraints",
              content: dialogContent,
              style: "width: 375px"
            });
            dialogModal.show();
          }));
        }
        // drawer size check
        this._drawer.resize();
      },
      _setTitle: function (title) {
        // set config title
        this.config.title = title;
        // window title
        window.document.title = title;
      },
      _setTitleBar: function () {
        // map title node
        var node = dom.byId('title');
        if (node) {
          // set title
          node.innerHTML = this.config.title;
          // title attribute
          domAttr.set(node, "title", this.config.title);
        }
      },
      _setDialogModalContent: function (content) {
        // set dialog modal content
        this.config.dialogModalContent = content;
      },
      // hide map loading spinner
      _hideLoadingIndicator: function () {
        // add loaded class
        domClass.remove(document.body, this.css.appLoading);
      },
      //create a map based on the input web map id
      _createWebMap: function (itemInfo) {
        // set extent from URL Param
        if (this.config.extent) {
          var e = this.config.extent.split(',');
          if (e.length === 4) {
            itemInfo.item.extent = [
              [ parseFloat(e[0]), parseFloat(e[1]) ],
              [ parseFloat(e[2]), parseFloat(e[3]) ]
            ];
          }
        }
        arcgisUtils.createMap(itemInfo, "mapDiv", { 
          ignorePopups: true,
          mapOptions: {
            minZoom: 4,
            maxZoom: 6
          }
        }).then(lang.hitch(this, function (response) {
          map = this.map = response.map;
          // this.layers = arcgisUtils.getLayerList(response);
          this.item = response.itemInfo.item;
          // window title and config title
          this._setTitle(this.config.title || response.itemInfo.item.title);
          // title bar title
          this._setTitleBar();
          // dialog modal content
          this._setDialogModalContent(this.config.dialogModalContent || response.itemInfo.item.licenseInfo);
          // map loaded
          if (this.map.loaded) {
            this._init();
            iceDisplay(this.map);
          } else {
            on.once(this.map, 'load', lang.hitch(this, function () {
              this._init();
              iceDisplay(this.map);
            }));
          }
        }), this.reportError);
      }
    });

    function iceDisplay(map) {
      console.log("extents", extents);
      var iceIndex = 0, iceLayers = [], layerLookup = {};
      var drawingAttribute = "show";
      var year, baseYear = 1979, interval, tick = 1500, playing;

      array.forEach(map.graphicsLayerIds, function(id, index) {
        iceLayers.push(id);
        layerLookup[id] = (index===0) ? "yes" : "no";
        var layer = map.getLayer(id);
        // console.log(id, layer.graphics.length);
        array.forEach(layer.graphics, function(g) {
          g.attributes[drawingAttribute] = layerLookup[id];
        });
        layer.styling = false;
        layer.dataAttributes = [ drawingAttribute ];
        layer.on("graphic-draw", function(e) {
          // console.log("id", id, layerLookup[id]);
          e.node.setAttribute("data-show", layerLookup[id]);
        });
        layer.show();
      });
      layerLookup[iceLayers[iceIndex]] = "yes";
      
      var bounds = graphicsUtils.graphicsExtent(map.getLayer(map.graphicsLayerIds[0]).graphics);
      map.setExtent(bounds).then(function() {
        year = dom.byId("iceInfo");
        year.innerHTML = iceIndex + baseYear + " ice area:<br>" + extents[baseYear + iceIndex] + 
          " " + extents.units;

        interval = setInterval(nextYear, tick);

        playPause();
      });

      function nextYear() {
        playing = true;
        var prevIndex = iceIndex;
        // Switch visibility
        layerLookup[iceLayers[iceIndex]] = "no";
        if ( iceIndex === iceLayers.length - 1 ) {
          iceIndex = 0;
        } else {
          iceIndex++;
        }
        year.innerHTML = iceIndex + baseYear + " ice area:<br>" + extents[baseYear + iceIndex] + 
          " " + extents.units;
        layerLookup[iceLayers[iceIndex]] = "yes";

        map.getLayer(iceLayers[prevIndex]).redraw();
        map.getLayer(iceLayers[iceIndex]).redraw();
        // console.log("redrew both", iceIndex, prevIndex);
      }

      function playPause() {
        on(dom.byId("playback"), "click", function(e) {
          if ( playing ) {
            clearInterval(interval);
            playing = false;
            this.innerHTML = "▶";
          } else {
            nextYear();
            interval = setInterval(nextYear, tick);
            this.innerHTML = "||";
          }
        });
        on(dom.byId("nextYear"), "click", showNext);
        on(dom.byId("prevYear"), "click", showPrev);
      }

      function showNext() {
        if ( !playing ) {
          var prevIndex = iceIndex;
          layerLookup[iceLayers[iceIndex]] = "no";
          if ( iceIndex === iceLayers.length - 1 ) {
            iceIndex = 0;
          } else {
            iceIndex++;
          }
          year.innerHTML = iceIndex + baseYear + " ice area:<br>" + extents[baseYear + iceIndex] + 
            " " + extents.units;
          layerLookup[iceLayers[iceIndex]] = "yes";

          map.getLayer(iceLayers[prevIndex]).redraw();
          map.getLayer(iceLayers[iceIndex]).redraw();
        }
      }

      function showPrev() {
        if ( !playing ) {
          var prevIndex = iceIndex;
          layerLookup[iceLayers[iceIndex]] = "no";
          if ( iceIndex - 1 < 0 ) {
            iceIndex = iceLayers.length - 1;
          } else {
            iceIndex--;
          }
          year.innerHTML = iceIndex + baseYear + " ice area:<br>" + extents[baseYear + iceIndex] + 
            " " + extents.units;
          layerLookup[iceLayers[iceIndex]] = "yes";

          map.getLayer(iceLayers[prevIndex]).redraw();
          map.getLayer(iceLayers[iceIndex]).redraw();
        }
      }
    }
  });