export interface Bookspot {
  id: number;
  nombre: string;
  addressText: string;
  latitude: number;
  longitude: number;
}

export const mockBookspots: Bookspot[] = [
  {
    id: 10,
    nombre: 'Biblioteca Pública Municipal de Triana',
    addressText: 'C. Rodrigo de Triana, 70, 41010 Sevilla',
    latitude: 37.3823,
    longitude: -6.0041,
  },
  {
    id: 11,
    nombre: 'Café literario El Gato Tuerto',
    addressText: 'C. Betis, 32, 41010 Sevilla',
    latitude: 37.3810,
    longitude: -6.0020,
  },
  {
    id: 12,
    nombre: 'Librería Palas (Nervión)',
    addressText: 'C. Nervión, 5, 41005 Sevilla',
    latitude: 37.3835,
    longitude: -5.9712,
  },
  {
    id: 13,
    nombre: 'Plaza del Altozano (frente al museo)',
    addressText: 'Plaza del Altozano, 41010 Sevilla',
    latitude: 37.3795,
    longitude: -6.0008,
  },
  {
    id: 14,
    nombre: 'MegaBiblio Universidad de Sevilla',
    addressText: 'C. San Fernando, 4, 41004 Sevilla',
    latitude: 37.3866,
    longitude: -5.9895,
  },
  {
    id: 15,
    nombre: 'Bookdrop Parque de María Luisa',
    addressText: 'Glorieta de la Infanta, 41013 Sevilla',
    latitude: 37.3765,
    longitude: -5.9850,
  },
];
