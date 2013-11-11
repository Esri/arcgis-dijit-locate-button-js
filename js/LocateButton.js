define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/has",
    "esri/kernel",
    "dijit/_WidgetBase",
    "dijit/a11yclick",
    "dijit/_TemplatedMixin",
    "dojo/on",
    "dojo/Deferred",
    // load template
    "dojo/text!zesri/dijit/templates/LocateButton.html",
    "dojo/i18n!zesri/nls/jsapi",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-attr",
    "esri/geometry/Point",
    "esri/SpatialReference",
    "esri/graphic",
    "esri/symbols/PictureMarkerSymbol",
    "esri/layers/GraphicsLayer"
],
function (
    Evented,
    declare,
    lang,
    has, esriNS,
    _WidgetBase, a11yclick, _TemplatedMixin,
    on,
    Deferred,
    dijitTemplate, i18n,
    domClass, domStyle, domAttr,
    Point, SpatialReference,
    Graphic, PictureMarkerSymbol,
    GraphicsLayer
) {
    var Widget = declare([_WidgetBase, _TemplatedMixin, Evented], {
        declaredClass: "esri.dijit.LocateButton",
        templateString: dijitTemplate,
        options: {
            theme: "LocateButton",
            map: null,
            visible: true,
            highlightLocation: true,
            symbol: new PictureMarkerSymbol(require.toUrl("esri/dijit") + '/images/blue-dot.png', 21, 21),
            infoTemplate: null,
            scale: null,
            useTracking: false,
            setScale: true,
            centerAt: true,
            geolocationOptions: {
                maximumAge: 0,
                timeout: 15000,
                enableHighAccuracy: true
            }
        },
        // lifecycle: 1
        constructor: function(options, srcRefNode) {
            // mix in settings and defaults
            var defaults = lang.mixin({}, this.options, options);
            // widget node
            this.domNode = srcRefNode;
            this._i18n = i18n;
            // hide if unsupported
            if (!navigator.geolocation) {
                defaults.visible = false;
                console.log('LocateButton::navigator.geolocation unsupported.');
            }
            // properties
            this.set("map", defaults.map);
            this.set("theme", defaults.theme);
            this.set("visible", defaults.visible);
            this.set("scale", defaults.scale);
            this.set("highlightLocation", defaults.highlightLocation);
            this.set("symbol", defaults.symbol);
            this.set("infoTemplate", defaults.infoTemplate);
            this.set("geolocationOptions", defaults.geolocationOptions);
            this.set("useTracking", defaults.useTracking);
            this.set("setScale", defaults.setScale);
            this.set("centerAt", defaults.centerAt);
            // listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("tracking", this._locate);
            this.watch("useTracking", lang.hitch(this, function() {
                if (this.get("tracking") && !this.get("useTracking")) {
                    this._stopTracking();
                }
                // update title of button
                this._setTitle();
            }));
            // classes
            this._css = {
                container: "locateContainer",
                locate: "zoomLocateButton",
                loading: "loading",
                tracking: "tracking"
            };
        },
        // bind listener for button to action
        postCreate: function() {
            this.inherited(arguments);
            this.own(on(this._locateNode, a11yclick, lang.hitch(this, this.locate)));
        },
        // start widget. called by user
        startup: function() {
            // map not defined
            if (!this.get("map")) {
                this.destroy();
                console.log('LocateButton::map required');
            }
            // graphics layer
            this.set("graphicsLayer", new GraphicsLayer());
            // add graphics layer to the map
            this.get("map").addLayer(this.get("graphicsLayer"));
            // graphics remove highlight on clear
            this._graphicsEvent = on(this.get("graphicsLayer"), 'graphics-clear', lang.hitch(this, function() {
                this.set("highlightGraphic", null);
            }));
            // when map is loaded
            if (this.get("map").loaded) {
                this._init();
            } else {
                on.once(this.get("map"), "load", lang.hitch(this, function() {
                    this._init();
                }));
            }
        },
        // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
        destroy: function() {
            // remove graphics layer event
            if (this._graphicsEvent) {
                this._graphicsEvent.remove();
            }
            // remove graphics layer
            if (this.get("graphicsLayer") && this.get("map")) {
                this.get("map").removeLayer(this.get("graphicsLayer"));
            }
            // remove watch if there
            this._removeWatchPosition();
            // do other stuff
            this.inherited(arguments);
        },
        /* ---------------- */
        /* Public Events */
        /* ---------------- */
        // locate
        // load
        /* ---------------- */
        /* Public Functions */
        /* ---------------- */
        clear: function() {
            this.get("graphicsLayer").clear();
        },
        locate: function() {
            // toggle tracking
            if (this.get("useTracking")) {
                this.set("tracking", !this.get("tracking"));
            }
            return this._locate();
        },
        show: function() {
            this.set("visible", true);
        },
        hide: function() {
            this.set("visible", false);
        },
        /* ---------------- */
        /* Private Functions */
        /* ---------------- */
        _setTitle: function() {
            if (this.get("useTracking")) {
                if (this.get("tracking")) {
                    domAttr.set(this._locateNode, "title", this._i18n.widgets.locateButton.locate.stopTracking);
                } else {
                    domAttr.set(this._locateNode, "title", this._i18n.widgets.locateButton.locate.tracking);
                }
            } else {
                domAttr.set(this._locateNode, "title", this._i18n.widgets.locateButton.locate.title);
            }
        },
        _removeWatchPosition: function() {
            if (this.get("watchId")) {
                // remove watch event
                navigator.geolocation.clearWatch(this.get("watchId"));
                // set watch event
                this.set("watchId", null);
            }
        },
        _stopTracking: function() {
            domClass.remove(this._locateNode, this._css.tracking);
            this._removeWatchPosition();
            // remove loading class
            this._hideLoading();
        },
        _startTracking: function() {
            domClass.add(this._locateNode, this._css.tracking);
            this._removeWatchPosition();
            var WatchId = navigator.geolocation.watchPosition(lang.hitch(this, function(position) {
                this._setPosition(position).then(lang.hitch(this, function(response) {
                    this._locateEvent(response);
                }), lang.hitch(this, function(error) {
                    if (!error) {
                        error = new Error("LocateButton::Error setting the position.");
                    }
                    this._locateError(error);
                }));
            }), lang.hitch(this, function(error) {
                if (!error) {
                    error = new Error("LocateButton::Could not get tracking position.");
                }
                this._locateError(error);
            }), this.get('geolocationOptions'));
            // set watch event
            this.set("watchId", WatchId);
        },
        _getCurrentPosition: function() {
            var def = new Deferred();
            // get location
            navigator.geolocation.getCurrentPosition(lang.hitch(this, function(position) {
                this._setPosition(position).then(lang.hitch(this, function(response) {
                    def.resolve(response);
                }), lang.hitch(this, function(error) {
                    if (!error) {
                        error = new Error("LocateButton::Error setting map position.");
                    }
                    def.reject(error);
                }));
            }), lang.hitch(this, function(error) {
                if (!error) {
                    error = new Error("LocateButton::Could not get current position.");
                }
                def.reject(error);
            }), this.get('geolocationOptions'));
            // return deferred
            return def.promise;
        },
        _locate: function() {
            var def = new Deferred();
            // add loading class
            this._showLoading();
            // geolocation support
            if (navigator.geolocation) {
                // watch position
                if (this.get("useTracking")) {
                    // watch position exists
                    if (this.get("tracking")) {
                        this._startTracking();
                        def.resolve({
                            tracking: true
                        });
                    } else {
                        this._stopTracking();
                        def.resolve({
                            tracking: false
                        });
                    }
                } else {
                    this._getCurrentPosition().then(lang.hitch(this, function(response) {
                        this._locateEvent(response);
                        def.resolve(response);
                    }), lang.hitch(this, function(error) {
                        if (!error) {
                            error = new Error("LocateButton::Could not get current position.");
                        }
                        this._locateError(error);
                        def.reject(error);
                    }));
                }
            } else {
                var error = new Error('LocateButton::geolocation unsupported');
                this._locateError(error);
                def.reject(error);
            }
            this._setTitle();
            return def.promise;
        },
        _setPosition: function(position) {
            var def = new Deferred();
            var error;
            // position returned
            if (position && position.coords) {
                // point info
                var latitude = position.coords.latitude;
                var longitude = position.coords.longitude;
                // scale info
                var scale = this.get("scale") || position.coords.accuracy || 50000;
                // set point
                var pt = new Point([longitude, latitude], new SpatialReference({
                    wkid: 4326
                }));
                if (pt) {
                    var evt = this._createEvent(pt, scale, position);
                    // highlight enabled
                    // if setScale is enabled
                    if (this.get("setScale")) {
                        // set scale
                        this.get("map").setScale(scale);
                    }
                    if (this.get("centerAt")) {
                        // center on point
                        this.get("map").centerAt(pt).then(lang.hitch(this, function() {
                            def.resolve(evt);
                        }), lang.hitch(this, function(error) {
                            if (!error) {
                                error = new Error("LocateButton::Could not center map.");
                            }
                            def.reject(error);
                        }));
                    } else {
                        def.resolve(evt);
                    }
                } else {
                    error = new Error('LocateButton::Invalid point');
                    def.reject(error);
                }
            } else {
                error = new Error('LocateButton::Invalid position');
                def.reject(error);
            }
            return def.promise;
        },
        _createEvent: function(pt, scale, position) {
            // graphic attributes
            var attributes = {
                position: position
            };
            // graphic variable
            var g = new Graphic(pt, this.get("symbol"), attributes, this.get("infoTemplate"));
            // set event
            var locateEvt = {
                graphic: g,
                scale: scale,
                position: position
            };
            // return event object
            return locateEvt;
        },
        _locateEvent: function(evt) {
            // event graphic
            if (evt.graphic) {
                // get highlight graphic
                var g = this.get("highlightGraphic");
                // if graphic currently on map
                if (g) {
                    g.setGeometry(evt.graphic.geometry);
                    g.setAttributes(evt.graphic.attributes);
                    g.setInfoTemplate(evt.graphic.infoTemplate);
                    g.setSymbol(evt.graphic.symbol);
                } else {
                    g = evt.graphic;
                    // highlight enabled
                    if (this.get("highlightLocation")) {
                        this.get("graphicsLayer").add(g);
                    }
                }
                // set highlight graphic
                this.set("highlightGraphic", g);
            }
            // hide loading class
            this._hideLoading();
            // emit event
            this.emit("locate", evt);
        },
        _locateError: function(error) {
            // remove loading class
            this._hideLoading();
            // emit event error
            this.emit("locate", {
                graphic: null,
                scale: null,
                position: null,
                error: error
            });
        },
        _showLoading: function() {
            if (!this.get("useTracking")) {
                domClass.add(this._locateNode, this._css.loading);
            }
        },
        _hideLoading: function() {
            if (!this.get("useTracking")) {
                domClass.remove(this._locateNode, this._css.loading);
            }
        },
        _init: function() {
            this._visible();
            this._setTitle();
            this.set("loaded", true);
            this.emit("load", {});
        },
        _updateThemeWatch: function(attr, oldVal, newVal) {
            domClass.remove(this.domNode, oldVal);
            domClass.add(this.domNode, newVal);
        },
        _visible: function() {
            if (this.get("visible")) {
                domStyle.set(this.domNode, 'display', 'block');
            } else {
                domStyle.set(this.domNode, 'display', 'none');
            }
        }
    });
    if (has("extend-esri")) {
        lang.setObject("dijit.LocateButton", Widget, esriNS);
    }
    return Widget;
});
