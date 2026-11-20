import mongoose from 'mongoose';
import axios from 'axios';
import { config } from '../config';
import { Appointment, Service, Transaction, User } from '../models';
import { ServiceStatus } from '../types';
import { uploadBufferToImgBB } from '../services/imgbb';

/**
 * Refreshes the production service catalog to the intended professional demo set.
 *
 * Safety/idempotency:
 *  - Matches an existing document by its exact professional name, or by the
 *    legacy "[Demo] <name>" label used by the first seed, and updates it in place.
 *  - Never deletes documents and never touches services with other names.
 *  - Uploaded images are reused when the stored image is already an ImgBB URL.
 *  - Demo appointment notes are normalised once; demo rows are identified by the
 *    reserved demo customer addresses, never by customer-facing text.
 */

interface CatalogEntry {
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  status: ServiceStatus;
  photoId: string;
}

const CATALOG: CatalogEntry[] = [
  { name: 'Precision Haircut', category: 'Haircut & Styling', description: 'Consultation, precision cut, wash and finish tailored to your face shape, hair texture and lifestyle.', price: 35, duration: 45, status: ServiceStatus.ACTIVE, photoId: 'photo-1503951914875-452162b0f3f1' },
  { name: 'Blow Dry & Finish', category: 'Haircut & Styling', description: 'Professional wash followed by a smooth blow dry and finish, with light styling to keep the look in place.', price: 25, duration: 30, status: ServiceStatus.ACTIVE, photoId: 'photo-1522337360788-8b13dee7a37e' },
  { name: 'Balayage & Highlights', category: 'Hair Coloring', description: 'Hand-painted balayage or precisely placed foil highlights, finished with a toner and a strengthening treatment.', price: 150, duration: 150, status: ServiceStatus.ACTIVE, photoId: 'photo-1562322140-8baeececf3df' },
  { name: 'Full Colour Application', category: 'Hair Coloring', description: 'All-over permanent colour with ammonia-free options, grey coverage and a gloss finish for shine.', price: 95, duration: 90, status: ServiceStatus.ACTIVE, photoId: 'photo-1519699047748-de8e457a634e' },
  { name: 'Keratin Smoothing Treatment', category: 'Hair Treatment', description: 'Frizz-control keratin therapy that smooths the cuticle and strengthens the hair for up to three months.', price: 180, duration: 120, status: ServiceStatus.ACTIVE, photoId: 'photo-1521590832167-7bcbfaa6381f' },
  { name: 'Deep Conditioning Ritual', category: 'Hair Treatment', description: 'Intensive moisture mask with steam and a slow scalp massage to restore softness and shine to dry hair.', price: 60, duration: 45, status: ServiceStatus.ACTIVE, photoId: 'photo-1519415943484-9fa1873496d4' },
  { name: 'Hydrating Facial', category: 'Facial & Skincare', description: 'Deep cleanse, gentle exfoliation and hyaluronic hydration, finished with a barrier-supporting moisturiser.', price: 70, duration: 60, status: ServiceStatus.ACTIVE, photoId: 'photo-1570172619644-dfd03ed5d881' },
  { name: 'Anti-Ageing Facial', category: 'Facial & Skincare', description: 'Firming facial with a collagen mask, facial massage and lymphatic drainage to soften fine lines.', price: 95, duration: 75, status: ServiceStatus.ACTIVE, photoId: 'photo-1512290923902-8a9f81dc236c' },
  { name: 'Bridal Makeup', category: 'Makeup', description: 'Long-wear bridal makeup with a personalised consultation, lash application and touch-up guidance for the day.', price: 200, duration: 120, status: ServiceStatus.ACTIVE, photoId: 'photo-1487412947147-5cebf100ffc2' },
  { name: 'Party Makeup', category: 'Makeup', description: 'Event-ready makeup in a soft glam or bolder evening look, matched to your outfit and lighting.', price: 85, duration: 60, status: ServiceStatus.ACTIVE, photoId: 'photo-1522335789203-aabd1fc54bc9' },
  { name: 'Classic Manicure', category: 'Manicure & Pedicure', description: 'Nail shaping, cuticle care, hand massage and polish in your choice of colour, with a strengthening base coat.', price: 30, duration: 40, status: ServiceStatus.ACTIVE, photoId: 'photo-1632345031435-8727f6897d53' },
  { name: 'Spa Pedicure', category: 'Manicure & Pedicure', description: 'Warm soak, exfoliation, callus care, foot and lower-leg massage, finished with polish.', price: 45, duration: 55, status: ServiceStatus.ACTIVE, photoId: 'photo-1633681926022-84c23e8cb2d6' },
  { name: 'Aromatherapy Massage', category: 'Spa & Massage', description: 'Full-body relaxation massage using essential oil blends chosen with your therapist before the session.', price: 90, duration: 60, status: ServiceStatus.ACTIVE, photoId: 'photo-1544161515-4ab6ce6db874' },
  { name: 'Balinese Massage', category: 'Spa & Massage', description: 'Deep-tissue Balinese massage combining acupressure, assisted stretching and aromatherapy oils.', price: 110, duration: 75, status: ServiceStatus.ACTIVE, photoId: 'photo-1600334129128-685c5582fd35' },
  { name: 'Beard Sculpt & Hot Towel Shave', category: 'Haircut & Styling', description: 'Beard shaping with a straight razor, hot towel preparation and a moisturising finish.', price: 25, duration: 30, status: ServiceStatus.ACTIVE, photoId: 'photo-1503443207922-dff7d543fd0e' },
  { name: 'Scalp & Hair Spa', category: 'Hair Treatment', description: 'Clarifying scalp treatment with massage and a strengthening ampoule to reduce build-up and flaking.', price: 70, duration: 50, status: ServiceStatus.INACTIVE, photoId: 'photo-1620916566398-39f1143ab7be' },
  { name: 'Eyebrow Threading & Tint', category: 'Facial & Skincare', description: 'Precise threading, brow mapping and a tint matched to your hair colour to frame the face.', price: 20, duration: 20, status: ServiceStatus.ACTIVE, photoId: 'photo-1522337660859-02fbefca4702' },
  { name: 'Bridal Hair Styling', category: 'Haircut & Styling', description: 'Trial-informed bridal updo or soft waves, set with pins and a finishing spray that holds through the day.', price: 120, duration: 90, status: ServiceStatus.ACTIVE, photoId: 'photo-1595777457583-95e059d581b8' },
];

const APPOINTMENT_NOTES = [
  'Please call me if the stylist is running more than ten minutes late.',
  'I would like a short consultation before the service starts.',
  'Parking is tight on weekends, so I may arrive five minutes early.',
  'Please avoid any strong fragrance products during my visit.',
];

const unsplashUrl = (photoId: string): string =>
  `https://images.unsplash.com/${photoId}?w=1200&q=80&fm=jpg`;

const resolveImage = async (photoId: string, existingImage?: string): Promise<string> => {
  if (existingImage && existingImage.startsWith('https://i.ibb.co')) {
    return existingImage;
  }

  try {
    const response = await axios.get<ArrayBuffer>(unsplashUrl(photoId), {
      responseType: 'arraybuffer',
      timeout: 40000,
    });
    const buffer = Buffer.from(response.data);
    if (buffer.length < 10000) {
      throw new Error(`image too small (${buffer.length} bytes)`);
    }
    return await uploadBufferToImgBB(buffer);
  } catch (error) {
    console.warn(
      `ImgBB upload failed for ${photoId}; falling back to the verified source URL:`,
      error instanceof Error ? error.message : error
    );
    return unsplashUrl(photoId);
  }
};

const refreshCatalog = async () => {
  let created = 0;
  let updated = 0;
  let untouched = 0;

  for (const entry of CATALOG) {
    const exact = await Service.findOne({ serviceName: entry.name });
    const legacy = exact
      ? null
      : await Service.findOne({ serviceName: `[Demo] ${entry.name}` });
    const existing = exact || legacy;

    const image = await resolveImage(entry.photoId, existing?.image);

    const fields = {
      serviceName: entry.name,
      category: entry.category,
      description: entry.description,
      price: entry.price,
      duration: entry.duration,
      status: entry.status,
      image,
    };

    if (existing) {
      const changed =
        !exact ||
        existing.category !== entry.category ||
        existing.description !== entry.description ||
        existing.price !== entry.price ||
        existing.duration !== entry.duration ||
        existing.status !== entry.status ||
        existing.image !== image;

      if (changed) {
        await Service.updateOne({ _id: existing._id }, { $set: fields });
        updated += 1;
        console.log(`updated  ${entry.name}`);
      } else {
        untouched += 1;
      }
    } else {
      await Service.create(fields);
      created += 1;
      console.log(`created  ${entry.name}`);
    }
  }

  // Normalise the customer-facing note on the demo appointments once.
  const demoCustomers = await User.find({
    email: { $regex: '^demo\\.customer\\d+@example\\.com$' },
  })
    .select('_id')
    .lean();
  const demoCustomerIds = demoCustomers.map(customer => customer._id);

  const demoAppointments = await Appointment.find({
    customerId: { $in: demoCustomerIds },
  }).lean();

  let notesUpdated = 0;
  for (const [index, appointment] of demoAppointments.entries()) {
    if (appointment.message === 'Demo appointment (seeded)') {
      await Appointment.updateOne(
        { _id: appointment._id },
        { $set: { message: APPOINTMENT_NOTES[index % APPOINTMENT_NOTES.length] } }
      );
      notesUpdated += 1;
    }
  }

  const serviceCount = await Service.countDocuments({});
  const activeCount = await Service.countDocuments({ status: ServiceStatus.ACTIVE });
  const transactionCount = await Transaction.countDocuments({});

  console.log('\n--- catalog summary ---');
  console.log(`services created: ${created}, updated: ${updated}, unchanged: ${untouched}`);
  console.log(`total services: ${serviceCount} (active: ${activeCount})`);
  console.log(`demo appointment notes normalised: ${notesUpdated}`);
  console.log(`transactions (unchanged): ${transactionCount}`);
};

const run = async () => {
  await mongoose.connect(config.mongodb.uri);
  console.log('Connected to MongoDB');
  await refreshCatalog();
  console.log('Catalog refresh finished');
};

run()
  .then(() => process.exit(0))
  .catch(async error => {
    console.error('CATALOG ERROR:', error instanceof Error ? error.message : error);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  });