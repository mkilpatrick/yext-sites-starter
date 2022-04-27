import { OpeningHours } from '../../components/schema/hours';
import { PhotoGallery } from '../../components/schema/photoGallery';
import { Address, Location } from '../../components/schema/address';
import { Review, AggregateRating } from '../../components/schema/review';
import { Offer } from '../../components/schema/offers';
import { Performer, Organization } from '../../components/schema/people';

// Main wrapper of all JSON-LD schema that is injected into the head script
export const SchemaWrapper = (data: any) => {
  let json = {
    ...LocalBusiness(data), // replace this to Product, Event or other component if needed
    // Additional Fields
    paymentAccepted: data.document.streamOutput.paymentOptions,
    makesOffer: data.document.streamOutput.services,
  }

  return `<script type="application/ld+json">
  ${JSON.stringify(json)}
  </script>`;
}

const BaseSchema = (data: any, schemaType: string) => {
  return {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: data.document.streamOutput.name,
  }
}

// LocalBusiness includes sub-LocalBusiness schema types, including:
// FinancialService, TravelAgency, GovernmentOffice, ShoppingCenter, MedicalBusiness etc
// pass different variables to the schemaType param if neededed
// more sub-types see https://schema.org/LocalBusiness
const LocalBusiness = (data: any, schemaType?: string) => {
  return {
    ...BaseSchema(data, schemaType ?? "LocalBusiness"), // default, if schemaType is nil, set to LocalBusiness
    ...Address(data.document.streamOutput.address),
    ...OpeningHours(data.document.streamOutput.hours),
    ...PhotoGallery(data.document.streamOutput.photoGallery),
    description: data.document.streamOutput.description,
    telephone: data.document.streamOutput.mainPhone,
    email: data.document.streamOutput.email,
  }
}

// https://schema.org/Product
// Make sure to double check if the fields are correct for your site
const Product = (data: any, schemaType?: string) => {
  return {
    ...BaseSchema(data, schemaType ?? "Product"),
    ...PhotoGallery(data.document.streamOutput.photoGallery),
    ...Review(data.document.streamOutput.c_reviews),
    ...AggregateRating(data.document.streamOutput.c_aggregateRating),
    ...Offer({
      url: "",
      priceCurrency: data.document.streamOutput.c_currency,
      price: data.document.streamOutput.price,
      priceValidUntil: data.document.streamOutput.expirationDate,
      itemCondition: data.document.streamOutput.stockStatus,
      availability: data.document.streamOutput.availabilityDate,
    }),
    description: data.document.streamOutput.description,
    sku: data.document.streamOutput.sku,
    mpn: data.document.streamOutput.mpn,
    brand: {
      "@type": "Brand",
      "name": data.document.streamOutput.brand,
    },
  }
}

// https://schema.org/Event
// Make sure to double check if the fields are correct for your site
const Event = (data: any, schemaType?: string) => {
  return {
    ...BaseSchema(data, schemaType ?? "Event"),
    ...PhotoGallery(data.document.streamOutput.photoGallery),
    ...Location({
      name: data.document.streamOutput.geomodifier,
      address: data.document.streamOutput.address,
    }),
    startDate: data.document.streamOutput.c_startDate,
    endDate: data.document.streamOutput.c_endDate,
    description: data.document.streamOutput.description,
    eventAttendanceMode: data.document.streamOutput.attendance,
    eventStatus: data.document.streamOutput.eventStatus,
    ...Performer(data.document.streamOutput.performers),
    ...Organization({
      name: data.document.streamOutput.organizerName,
    }),
    ...Offer({
      url: "",
      priceCurrency: data.document.streamOutput.c_currency,
      price: data.document.streamOutput.price,
      priceValidUntil: data.document.streamOutput.expirationDate,
      itemCondition: data.document.streamOutput.stockStatus,
      availability: data.document.streamOutput.availabilityDate,
    }),
  }
}
