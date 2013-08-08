define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_OnDijitClickMixin",
    "dijit/_TemplatedMixin",
    "dojo/on",
    // load template
    "dojo/text!./templates/locateButton.html",
    "dojo/i18n!./nls/locateButton",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-style",
    "esri/geometry/webMercatorUtils",
    "esri/geometry/Point",
    "esri/SpatialReference",
    "esri/graphic",
    "esri/symbols/PictureMarkerSymbol"
],
function (
    Evented,
    declare,
    lang,
    _WidgetBase, _OnDijitClickMixin, _TemplatedMixin,
    on,
    dijitTemplate, i18n,
    dom, domClass, domStyle,
    webMercatorUtils, Point, SpatialReference,
    Graphic, PictureMarkerSymbol
) {
    return declare([_WidgetBase, _OnDijitClickMixin, _TemplatedMixin], {
        declaredClass: "modules.locateButton",
        templateString: dijitTemplate,
        options: {
            theme: "locateButton",
            map: null,
            visible: true,
            showPointer: true,
            pointerGraphic: new Graphic(null, new PictureMarkerSymbol('images/bluedot_retina.png', 21, 21)),
            scale: null,
            locateSettings: {
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
            this.set("showPointer", this.options.showPointer);
            this.set("pointerGraphic", this.options.pointerGraphic);
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
                return new Error('map required');
            }
            // map domNode
            this._mapNode = dom.byId(this.map.id);
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
        onLoad: function() {
            this.set("loaded", true);
        },
        onLocate: function(){
            this.emit("located", this.get("pointerGraphic"));
        },
        /* ---------------- */
        /* Public Functions */
        /* ---------------- */
        clear: function(){
            if(this.get("pointerGraphic")){
                this.map.graphics.remove(this.get("pointerGraphic"));
            }
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
                                if(this.get("showPointer")){
                                    this.clear();
                                }
                                var attributes = this.get("pointerGraphic").attributes || {};
                                attributes.position = position;
                                var newGraphic = this.get("pointerGraphic").setGeometry(pt).setAttributes(attributes);
                                this.set("pointerGraphic", newGraphic);
                                this.onLocate();
                                if(this.get("showPointer")){
                                    this.map.graphics.add(this.get("pointerGraphic"));
                                }
                                this._hideLoading();
                            })); 
                        }
                        else{
                            this._hideLoading();
                            return new Error('Invalid point');
                        }
                    }
                    else{
                        this._hideLoading();
                        return new Error('Invalid position');
                    }
                }), lang.hitch(this, function(err) {
                    this._hideLoading();
                    return err;
                }), this.options.locateSettings);
            }
            else{
                this._hideLoading();
                return new Error('geolocation unsupported');
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
            this.onLoad();
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
});