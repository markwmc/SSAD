import { IonContent, IonHeader, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import axios from 'axios';
import * as L from 'leaflet';
import { twoline2satrec, propagate, degreesLat, degreesLong, eciToGeodetic, gstime } from 'satellite.js';
import './Home.css';
import { useState, useEffect } from 'react';

const Home: React.FC = () => {
  const [map, setMap] = useState<L.Map | null>(null);
  const [satelliteData, setSatelliteData] = useState<any[]>([]);

  useEffect(() => {
    const mapInstance = L.map('satellite-map').setView([0, 0], 2);
    setMap(mapInstance);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);

    fetchSingleSatellite(mapInstance);

    return () => {
      mapInstance.remove();
    };
  }, []);

  const fetchSingleSatellite = async (mapInstance: L.Map) => {
    try {
      const response = await axios.get('https://www.celestrak.com/NORAD/elements/stations.txt');
      const tleData = response.data;
      processSingleSatellite(tleData, mapInstance);
    } catch (error) {
      console.error('Error fetching satellite data: ', error);
    }
  };

  const processSingleSatellite = (tleData: string, mapInstance: L.Map) => {
    const lines = tleData.split('\n');
    const name = lines[0]?.trim(); // Name of the first satellite
    const tleLine1 = lines[1]?.trim(); // First TLE line
    const tleLine2 = lines[2]?.trim(); // Second TLE line

    if (name && tleLine1 && tleLine2) {
      try {
        const satrec = twoline2satrec(tleLine1, tleLine2);
        const now = new Date();
        const positionAndVelocity = propagate(satrec, now);

        if (positionAndVelocity.position && typeof positionAndVelocity.position !== 'boolean') {
          const { x, y, z } = positionAndVelocity.position;

          const gmst = gstime(now);
          const geodeticCoords = eciToGeodetic({ x, y, z }, gmst);

          const lat = degreesLat(geodeticCoords.latitude);
          const lon = degreesLong(geodeticCoords.longitude);

          if (!isNaN(lat) && !isNaN(lon)) {
            setSatelliteData([{ name, lat, lon }]); // Replace state with a single satellite

            // Add marker to the map
            L.marker([lat, lon])
              .addTo(mapInstance)
              .bindPopup(name)
              .openPopup();

            // Center the map on the satellite's position
            mapInstance.setView([lat, lon], 5); // Adjust zoom level as needed
          } else {
            console.warn(`Invalid coordinates for satellite: ${name}`);
          }
        } else {
          console.warn(`No position available for satellite: ${name}`);
        }
      } catch (error) {
        console.error(`Error processing TLE for satellite ${name}`, error);
      }
    } else {
      console.warn('TLE data is incomplete or invalid for the first satellite.');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Space Situational Awareness Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div id="satellite-map" style={{ height: '100%' }}></div>
        <IonList>
          {satelliteData.map((satellite, index) => (
            <IonItem key={index}>
              <IonLabel>
                {satellite.name}: {satellite.lat.toFixed(2)}, {satellite.lon.toFixed(2)}
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Home;
