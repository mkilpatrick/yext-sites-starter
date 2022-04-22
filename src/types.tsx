export interface FieldReference<T> {
  name: KeysWithValsOfType<Profile, T>
  "__fieldRefMarker": never // there's a way to do this with symbols I just don't know it
}

export type ValueOrFieldReference<T> = T | FieldReference<T>

export type KeysWithValsOfType<T,V> = keyof { [ P in keyof T as T[P] extends V ? P : never ] : P };

export function FieldReference<T>(x: KeysWithValsOfType<Profile, T>): FieldReference<T> {
  return {name: x, "__fieldRefMarker": null} as FieldReference<T>
}

export function isFieldReference<T>(x: any | FieldReference<T>): x is FieldReference<T> {
  if (typeof x !== "object") return false;
  return "__fieldRefMarker" in x
}

export type Address = {
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export interface Hours extends Record<string, any> {
  monday?: Day;
  tuesday?: Day;
  wednesday?: Day;
  thursday?: Day;
  friday?: Day;
  saturday?: Day;
  sunday?: Day;
}

export type Day = {
  isClosed: boolean;
  openIntervals: OpenIntervals[];
};

export type OpenIntervals = {
  start: string;
  end: string;
};

export type Thumbnail = {
  height: number;
  width: number;
  url: string;
};

type Photo = {
  description: string
  details: string
  image: Image;
};

type Image = {
  height?: number;
  width?: number;
	alternateText?: string
  url: string;
  thumbnails?: Thumbnail[];
};

export type PhotoGallery = {
  photoGallery: Image[];
};

// Should autogenerate this from stream schema or something
export interface Profile {
	name: string
	logo: Photo
	address: Address
	openTime: string
	hours: Hours
	mainPhone: string
	geocodedCoordinate: Coordinates
	services: string[]
	photoGallery: PhotoGallery
	_site: any
}