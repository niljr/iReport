import axios from 'axios';
import { $ } from './bling';
const mapOptions = {
	center: { lat: 10.7, lng: 122.5  },
	zoom: 12
};

function loadPlaces(map, lat=10.7, lng=122.5) {
	axios.get(`/api/reports/near?lat=${lat}&lng=${lng}`)
		.then(res => {
			const places = res.data;
			if (!places.length) {
				alert('no places found!');
				return;
			}

			// create a bounds
			const bounds = new google.maps.LatLngBounds();
			const infoWindow = new google.maps.InfoWindow();

			const markers = places.map(place => {
				const [placeLng, placeLat] = place.location.coordinates;
				const position = { lat: placeLat, lng: placeLng };
				bounds.extend(position);
				const marker = new google.maps.Marker({ map, position });
				marker.place = place;
				return marker;
			}); 

			// when someone clicks on a marker. shpw the details of that place
			markers.forEach(marker => marker.addListener('click', function() {
				const html = `
					<div class="popup">
						<a href="/report/${this.place.slug}">
							<img src="/uploads/${this.place.photo || 'store.png'}" alt="${this.place.title}" />
						</a>
						<p>${this.place.title} - ${this.place.location.address}</p>
					</div>
				`;
				infoWindow.setContent(html);
				infoWindow.open(map, this);
			}));

			// zoom the map to fil all the markers perfectly
			map.setCenter(bounds.getCenter());
			map.fitBounds(bounds);
		})
}

function makeMap(mapDiv) {
	if (!mapDiv) return;
	// map map
	const map = new google.maps.Map(mapDiv, mapOptions);
	loadPlaces(map)

	const input = $('[name="geolocate"]');
	const autocomplete = new google.maps.places.Autocomplete(input);
	
	 // Limit country to Philippine only
	autocomplete.setComponentRestrictions({
		'country': ['ph']
	});

	autocomplete.addListener('place_changed', () => {
		const place = autocomplete.getPlace();
		loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng());
	});

}


export default makeMap;