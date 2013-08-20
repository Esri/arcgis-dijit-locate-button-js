define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/has",
    "esri/kernel",
    "dijit/_WidgetBase",
    "dijit/_OnDijitClickMixin",
    "dijit/_TemplatedMixin",
    "dojo/on",
    // load template
    "dojo/text!./templates/LocateButton.html",
    "dojo/i18n!./nls/LocateButton",
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
    _WidgetBase, _OnDijitClickMixin, _TemplatedMixin,
    on,
    dijitTemplate, i18n,
    domClass, domStyle,
    webMercatorUtils, Point, SpatialReference,
    Graphic, PictureMarkerSymbol,
    GraphicsLayer
) {
    var Widget = declare([_WidgetBase, _OnDijitClickMixin, _TemplatedMixin], {
        declaredClass: "esri.dijit.LocateButton",
        templateString: dijitTemplate,
        options: {
            theme: "LocateButton",
            map: null,
            visible: true,
            highlightLocation: true,
            symbol: new PictureMarkerSymbol(require.toUrl("esri/dijit") + '/images/bluedot_retina.png', 21, 21),
            infoTemplate: null,
            scale: null,
            geolocationOptions: {
                maximumAge: 3000,
                timeout: 1000,
                enableHighAccuracy: true
            }
        },
        // lifecycle: 1
        constructor: function(options, srcRefNode) {
            // mix in settings and defaults
            declare.safeMixin(this.options, options);
            // widget node
            this.domNode = srcRefNode;
            this._i18n = i18n;
            if (!navigator.geolocation) {
                this.options.visible = false;
            }
            // properties
            this.set("map", this.options.map);
            this.set("theme", this.options.theme);
            this.set("visible", this.options.visible);
            this.set("scale", this.options.scale);
            this.set("highlightLocation", this.options.highlightLocation);
            this.set("symbol", this.options.symbol);
            this.set("infoTemplate", this.options.infoTemplate);
            // listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            // classes
            this._css = {
                container: "locateCon",
                locate: "zoomLocateButton",
                loading: "loading"
            };
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
            this._showLoading();
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(lang.hitch(this, function(position) {
                    if (position) {
                        var latitude = position.coords.latitude;
                        var longitude = position.coords.longitude;
                        var scale = this.get("scale") || position.coords.accuracy || 50000;
                        // set point
                        var pt = webMercatorUtils.geographicToWebMercator(new Point(longitude, latitude, new SpatialReference(4326)));
                        if(pt){
                            this.map.setScale(scale);
                            return this.map.centerAt(pt).then(lang.hitch(this, function(){
                                if(this.get("highlightLocation")){
                                    this.clear();
                                }
                                var attributes = {
                                    position: position
                                };
                                var graphic = new Graphic(pt, this.get("symbol"), attributes, this.get("infoTemplate"));
                                this.emit("locate", {graphic: graphic});
                                if(this.get("highlightLocation")){
                                    this._graphics.add(graphic);
                                }
                                this._hideLoading();
                            })); 
                        }
                        else{
                            this._hideLoading();
                            console.log('LocateButton::Invalid point');
                        }
                    }
                    else{
                        this._hideLoading();
                        console.log('LocateButton::Invalid position');
                    }
                }), lang.hitch(this, function(err) {
                    this._hideLoading();
                    return err;
                }), this.options.geolocationOptions);
            }
            else{
                this._hideLoading();
                console.log('LocateButton::geolocation unsupported');
            }
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