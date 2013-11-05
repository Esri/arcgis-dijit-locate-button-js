# arcgis-dijit-locate-button-js

## Features
A simple dijit button that when clicked navigates to the users current location using HTML5 Geolocation if available.

![App](https://raw.github.com/driskull/arcgis-dijit-locate-button-js/master/images/demo.png)

[View Demo](http://driskull.github.com/arcgis-dijit-locate-button-js/)

## Instructions

Basic use

    var myWidget = new locateButton({
        map: myMap,
    }, "locateButton");
    myWidget.startup();
    
All options
    
    myWidget = new locateButton({
        theme: "locateButton", // (optional). class name for the widget container. default: "locateButton"
        map: myMap, // (required) map object. default: null.
        visible: true, // (optional) show the widget. default: true.
        highlightLocation: true, // (optional) show a graphic on the location when geolocated. default: true.
        scale: null, // (optional) scale in meters to geolocate to. Defaults to accuracy from geolocation.
        symbol: new PictureMarkerSymbol(require.toUrl("esri/dijit") + '/images/blue-dot.png', 21, 21), // (optional)
        infoTemplate: null, // (optional) popup info template. default: null
        useTracking: true, // (optional) use watchPosition instead of getCurrentLocation. default: false
        setScale: true, // (optional) set scale on locate. default: true.
        centerAt: true, // (optional) center at point on locate. default: true
        geolocationOptions: // (optional). default: { maximumAge: 0, timeout: 15000, enableHighAccuracy: true}
    }, "locateButton");
    myWidget.startup();     


 [New to Github? Get started here.](https://github.com/)

## Requirements

* Notepad or HTML editor
* A little background with Javascript
* Experience with the [ArcGIS Javascript API](http://www.esri.com/) would help.

## Resources

* [ArcGIS for JavaScript API Resource Center](http://help.arcgis.com/en/webapi/javascript/arcgis/index.html)
* [ArcGIS Blog](http://blogs.esri.com/esri/arcgis/)
* [twitter@esri](http://twitter.com/esri)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.

## Contributing

Anyone and everyone is welcome to contribute.

## Licensing
Copyright 2012 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [license.txt](https://raw.github.com/Esri/geocoder-search-widget-js/master/license.txt) file.

[](Esri Tags: ArcGIS JavaScript API Dijit module swipe Widget Public swipemap LayerSwipe)
[](Esri Language: JavaScript)