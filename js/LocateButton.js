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
    "esri/geometry/webMercatorUtils",
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
    domClass, domStyle,
    webMercatorUtils, Point, SpatialReference,
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
            if (!navigator.geolocation) {
                defaults.visible = false;
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
            // listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            // classes
            this._css = {
                container: "locateContainer",
                locate: "zoomLocateButton",
                loading: "loading"
            };
        },
        // bind listener for button to action
        postCreate: function() {
            this.inherited(arguments);
            this.own(
                on(this._locateNode, a11yclick, lang.hitch(this, this.locate))
            );
        },
        // start widget. called by user
        startup: function() {
            // map not defined
            if (!this.map) {
                this.destroy();
                console.log('LocateButton::map required');
            }
            this._graphics = new GraphicsLayer();
            this.map.addLayer(this._graphics);
            // when map is loaded
            if (this.map.loaded) {
                this._init();
            } else {
                on(this.map, "load", lang.hitch(this, function() {
                    this._init();
                }));
            }
        },
        // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
        destroy: function() {
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
        clear: function(){
            this._graphics.clear();
        },
        locate: function() {
            var def = new Deferred();
            // add loading class
            this._showLoading();
            // geolocation support
            if (navigator.geolocation) {
                // get location
                navigator.geolocation.getCurrentPosition(lang.hitch(this, function(position) {
                    // position returned
                    if (position) {
                        // point info
                        var latitude = position.coords.latitude;
                        var longitude = position.coords.longitude;
                        // scale info
                        var scale = this.get("scale") || position.coords.accuracy || 50000;
                        // set point
                        var pt = webMercatorUtils.geographicToWebMercator(new Point(longitude, latitude, new SpatialReference(4326)));
                        if(pt){
                            // set scale
                            this.map.setScale(scale);
                            // center on point
                            this.map.centerAt(pt).then(lang.hitch(this, function(){
                                // highlight enabled
                                if(this.get("highlightLocation")){
                                    this.clear();
                                }
                                // graphic attributes
                                var attributes = {
                                    position: position
                                };
                                // create graphic
                                var graphic = new Graphic(pt, this.get("symbol"), attributes, this.get("infoTemplate"));
                                // highlight enabled
                                if(this.get("highlightLocation")){
                                    this._graphics.add(graphic);
                                }
                                // hide loading class
                                this._hideLoading();
                                // set event
                                var locateEvt = {graphic: graphic, scale: scale, position: position};
                                this.emit("locate", locateEvt);
                                def.resolve(locateEvt);
                            }), lang.hitch(this, function(error){
                                def.reject(error.message);
                            }));
                        }
                        else{
                            // remove loading class
                            this._hideLoading();
                            def.reject('LocateButton::Invalid point');
                            console.log('LocateButton::Invalid point');
                        }
                    }
                    else{
                        // remove loading class
                        this._hideLoading();
                        console.log('LocateButton::Invalid position');
                        def.reject('LocateButton::Invalid position');
                    }
                }), lang.hitch(this, function(err) {
                    // remove loading class
                    this._hideLoading();
                    var errorMessage = 'LocateButton::' + err.code + ":" + err.message;
                    console.log(errorMessage);
                    def.reject(errorMessage);
                }), this.get('geolocationOptions'));
            }
            else{
                this._hideLoading();
                console.log('LocateButton::geolocation unsupported');
                def.reject('LocateButton::geolocation unsupported');
            }
            return def.promise;
        },
        show: function(){
            this.set("visible", true);  
        },
        hide: function(){
            this.set("visible", false);
        },
        /* ---------------- */
        /* Private Functions */
        /* ---------------- */
        _showLoading: function(){
            domClass.add(this._locateNode, this._css.loading);
        },
        _hideLoading: function(){
            domClass.remove(this._locateNode, this._css.loading);
        },
        _init: function() {
            this._visible();
            this.set("loaded", true);
            this.emit("load", {});
        },
        _updateThemeWatch: function(attr, oldVal, newVal) {
            domClass.remove(this.domNode, oldVal);
            domClass.add(this.domNode, newVal);
        },
        _visible: function(){
            if(this.get("visible")){
                domStyle.set(this.domNode, 'display', 'block');
            }
            else{
                domStyle.set(this.domNode, 'display', 'none');
            }
        }
    });
    if (has("extend-esri")) {
        lang.setObject("dijit.LocateButton", Widget, esriNS);
    }
    return Widget;
});
