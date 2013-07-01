define([
    "dojo/Evented",
    "dojo/_base/declare",
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
            locateLOD: 16,
            showPointer: true,
            pointerGraphic: new Graphic(null, new PictureMarkerSymbol('images/bluedot_retina.png', 21, 21)),
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
            this.set("locateLOD", this.options.locateLOD);
            this.set("theme", this.options.theme);
            this.set("visible", this.options.visible);
            this.set("showPointer", this.options.showPointer);
            this.set("pointerGraphic", this.options.pointerGraphic);
            // listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            // classes
            this._css = {
                container: "container",
                locate: "zoomLocateButton",
                loading: "loading"
            };
        },
        // start widget. called by user
        startup: function() {
            var _self = this;
            // map not defined
            if (!_self.map) {
                _self.destroy();
                return new Error('map required');
            }
            // map domNode
            _self._mapNode = dom.byId(_self.map.id);
            // when map is loaded
            if (_self.map.loaded) {
                _self._init();
            } else {
                on(_self.map, "load", function() {
                    _self._init();
                });
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
            var _self = this;
            if(_self.get("pointerGraphic")){
                _self.map.graphics.remove(_self.get("pointerGraphic"));
            }
        },
        locate: function() {
            var _self = this;
            _self._showLoading();
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position) {
                    if (position) {
                        var latitude = position.coords.latitude;
                        var longitude = position.coords.longitude;
                        // set point
                        var pt = webMercatorUtils.geographicToWebMercator(new Point(longitude, latitude, new SpatialReference(4326)));
                        if(pt){
                            return _self.map.centerAndZoom(pt, _self.get("locateLOD")).then(function(){
                                if(_self.get("showPointer")){
                                    _self.clear();
                                }
                                var attributes = _self.get("pointerGraphic").attributes || {};
                                attributes.position = position;
                                var newGraphic = _self.get("pointerGraphic").setGeometry(pt).setAttributes(attributes);
                                _self.set("pointerGraphic", newGraphic);
                                _self.onLocate();
                                if(_self.get("showPointer")){
                                    _self.map.graphics.add(_self.get("pointerGraphic"));
                                }
                                _self._hideLoading();
                            });    
                        }
                        else{
                            _self._hideLoading();
                            return new Error('Invalid point');
                        }
                    }
                    else{
                        _self._hideLoading();
                        return new Error('Invalid position');
                    }
                }, function(err) {
                    _self._hideLoading();
                    return err;
                }, _self.options.locateSettings);
            }
            else{
                _self._hideLoading();
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
            var _self = this;
            _self._visible();
            _self.onLoad();
        },
        _updateThemeWatch: function(attr, oldVal, newVal) {
            var _self = this;
            domClass.remove(_self.domNode, oldVal);
            domClass.add(_self.domNode, newVal);
        },
        _visible: function(){
            var _self = this;
            if(_self.get("visible")){
                domStyle.set(_self.domNode, 'display', 'block');
            }
            else{
                domStyle.set(_self.domNode, 'display', 'none');
            }
        }
    });
});