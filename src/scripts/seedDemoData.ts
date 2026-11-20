import mongoose from 'mongoose';
import { config } from '../config';
import { initAuth, getAuth } from '../config/auth';
import { Appointment, Service, Transaction, User } from '../models';
import { AppointmentStatus, PaymentStatus, ServiceStatus, UserRole } from '../types';
import { SERVICE_CATEGORIES, TIME_SLOTS } from '../constants';

/**
 * Idempotent, additive demo-data seed for the production database.
 *
 * Safety properties:
 *  - Never deletes, updates or replaces existing documents.
 *  - Services are tagged with a "[Demo] " name prefix and matched by exact name.
 *  - Demo customers use reserved example.com addresses and are created through
 *    Better Auth's sign-up endpoint (the app's supported account creation path).
 *  - Appointments are tagged via their message field and matched on the natural
 *    key (customer, service, date, slot).
 *  - No transaction records are ever created.
 *  - Re-running the script is a no-op for records that already exist.
 *
 * Requires DEMO_SEED_PASSWORD in the environment; the password is never logged.
 */

const DEMO_NAME_PREFIX = '[Demo] ';
const DEMO_APPOINTMENT_MESSAGE = 'Demo appointment (seeded)';
const DEMO_APPOINTMENT_COUNT = 24;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const DEMO_SERVICE_NAME_PATTERN = new RegExp(`^${escapeRegExp(DEMO_NAME_PREFIX)}`);

interface DemoService {
  serviceName: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  status: ServiceStatus;
}

const DEMO_SERVICES: DemoService[] = [
  { serviceName: 'Precision Haircut', category: 'Haircut & Styling', description: 'Consultation, precision cut, wash and finish tailored to your face shape and hair type.', price: 35, duration: 45, status: ServiceStatus.ACTIVE },
  { serviceName: 'Blow Dry & Finish', category: 'Haircut & Styling', description: 'Professional wash, blow dry and styling for a smooth, polished finish.', price: 25, duration: 30, status: ServiceStatus.ACTIVE },
  { serviceName: 'Balayage & Highlights', category: 'Hair Coloring', description: 'Hand-painted balayage or foil highlights with toner and conditioning treatment.', price: 150, duration: 150, status: ServiceStatus.ACTIVE },
  { serviceName: 'Full Colour Application', category: 'Hair Coloring', description: 'All-over permanent colour with ammonia-free options and gloss finish.', price: 95, duration: 90, status: ServiceStatus.ACTIVE },
  { serviceName: 'Keratin Smoothing Treatment', category: 'Hair Treatment', description: 'Frizz-control keratin therapy that smooths and strengthens for up to three months.', price: 180, duration: 120, status: ServiceStatus.ACTIVE },
  { serviceName: 'Deep Conditioning Ritual', category: 'Hair Treatment', description: 'Intensive moisture mask with steam and scalp massage to restore shine.', price: 60, duration: 45, status: ServiceStatus.ACTIVE },
  { serviceName: 'Hydrating Facial', category: 'Facial & Skincare', description: 'Deep cleanse, exfoliation and hyaluronic hydration for tired or dry skin.', price: 70, duration: 60, status: ServiceStatus.ACTIVE },
  { serviceName: 'Anti-Ageing Facial', category: 'Facial & Skincare', description: 'Firming facial with collagen mask, facial massage and lymphatic drainage.', price: 95, duration: 75, status: ServiceStatus.ACTIVE },
  { serviceName: 'Bridal Makeup', category: 'Makeup', description: 'Long-wear bridal makeup with lashes, trial consultation available separately.', price: 200, duration: 120, status: ServiceStatus.ACTIVE },
  { serviceName: 'Party Makeup', category: 'Makeup', description: 'Event-ready makeup with a soft glam or bold look of your choice.', price: 85, duration: 60, status: ServiceStatus.ACTIVE },
  { serviceName: 'Classic Manicure', category: 'Manicure & Pedicure', description: 'Nail shaping, cuticle care, hand massage and polish in your colour choice.', price: 30, duration: 40, status: ServiceStatus.ACTIVE },
  { serviceName: 'Spa Pedicure', category: 'Manicure & Pedicure', description: 'Soak, exfoliation, callus care, massage and polish for tired feet.', price: 45, duration: 55, status: ServiceStatus.ACTIVE },
  { serviceName: 'Aromatherapy Massage', category: 'Spa & Massage', description: 'Full-body relaxation massage using essential oil blends of your choice.', price: 90, duration: 60, status: ServiceStatus.ACTIVE },
  { serviceName: 'Balinese Massage', category: 'Spa & Massage', description: 'Deep-tissue Balinese massage combining acupressure, stretching and aromatherapy.', price: 110, duration: 75, status: ServiceStatus.ACTIVE },
  { serviceName: 'Beard Sculpt & Hot Towel Shave', category: 'Haircut & Styling', description: 'Beard shaping, straight razor detailing and hot towel finish.', price: 25, duration: 30, status: ServiceStatus.ACTIVE },
  { serviceName: 'Scalp & Hair Spa', category: 'Hair Treatment', description: 'Clarifying scalp treatment with massage and strengthening ampoule.', price: 70, duration: 50, status: ServiceStatus.INACTIVE },
  { serviceName: 'Eyebrow Threading & Tint', category: 'Facial & Skincare', description: 'Precise threading, brow mapping and tint to frame the face.', price: 20, duration: 20, status: ServiceStatus.ACTIVE },
  { serviceName: 'Bridal Hair Styling', category: 'Haircut & Styling', description: 'Trial-informed bridal updo or soft waves with pins and finishing spray.', price: 120, duration: 90, status: ServiceStatus.INACTIVE },
];

const DEMO_CUSTOMER_NAMES = [
  'Demo Customer One',
  'Demo Customer Two',
  'Demo Customer Three',
  'Demo Customer Four',
  'Demo Customer Five',
  'Demo Customer Six',
  'Demo Customer Seven',
  'Demo Customer Eight',
];

const APPOINTMENT_STATUS_PLAN: AppointmentStatus[] = [
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.PENDING,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.PENDING,
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.PENDING,
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.PENDING,
];

const startOfUtcDay = (offsetDays: number): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
};

const seedServices = async () => {
  let created = 0;
  let skipped = 0;

  for (const [index, demo] of DEMO_SERVICES.entries()) {
    const serviceName = `${DEMO_NAME_PREFIX}${demo.serviceName}`;
    const existing = await Service.findOne({ serviceName }).lean();
    if (existing) {
      skipped += 1;
      continue;
    }

    await Service.create({
      serviceName,
      category: demo.category,
      description: demo.description,
      price: demo.price,
      duration: demo.duration,
      // picsum.photos serves deterministic, reachable placeholder images; no ImgBB
      // upload is performed or implied for demo records.
      image: `https://picsum.photos/seed/salonbook-demo-${index + 1}/800/600`,
      status: demo.status,
    });
    created += 1;
  }

  return { created, skipped };
};

const seedDemoCustomers = async (password: string) => {
  const auth = await initAuth();
  let created = 0;
  let skipped = 0;

  for (const [index, name] of DEMO_CUSTOMER_NAMES.entries()) {
    const email = `demo.customer${index + 1}@example.com`;

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      skipped += 1;
      continue;
    }

    await auth.api.signUpEmail({
      body: { name, email, password },
    });

    // Keep demo accounts explicitly non-privileged and unverified but usable.
    await User.updateOne({ email }, { $set: { role: UserRole.CUSTOMER, isBlocked: false } });
    created += 1;
  }

  return { created, skipped, auth };
};

const seedAppointments = async () => {
  // Deterministic ordering keeps the customer/service/date/slot mapping stable
  // across runs, which is what makes re-running the seed a no-op.
  const services = await Service.find({ serviceName: DEMO_SERVICE_NAME_PATTERN })
    .sort({ serviceName: 1 })
    .lean();
  const customers = await User.find({ email: { $regex: '^demo\\.customer\\d+@example\\.com$' } })
    .select('_id email')
    .sort({ email: 1 })
    .lean();

  if (services.length === 0 || customers.length === 0) {
    throw new Error('Services or demo customers are missing; run the service/customer seed first');
  }

  const serviceIds = services.map(service => service._id);
  const customerIds = customers.map(customer => customer._id);

  let created = 0;
  let skipped = 0;

  for (let index = 0; index < DEMO_APPOINTMENT_COUNT; index += 1) {
    const customerId = customerIds[index % customerIds.length];
    const service = services[index % services.length];
    const status = APPOINTMENT_STATUS_PLAN[index % APPOINTMENT_STATUS_PLAN.length];

    const isPast = status === AppointmentStatus.CANCELLED;
    const appointmentDate = isPast
      ? startOfUtcDay(-((index % 5) + 1))
      : startOfUtcDay((index % 12) + 1);

    const reservesSlot =
      status === AppointmentStatus.PENDING || status === AppointmentStatus.CONFIRMED;

    let placed = false;

    for (let attempt = 0; attempt < TIME_SLOTS.length && !placed; attempt += 1) {
      const timeSlot = TIME_SLOTS[(index * 5 + attempt) % TIME_SLOTS.length];

      const duplicate = await Appointment.exists({
        customerId,
        appointmentDate,
        message: DEMO_APPOINTMENT_MESSAGE,
      });
      if (duplicate) continue;

      if (reservesSlot) {
        const customerClash = await Appointment.exists({
          customerId,
          appointmentDate,
          timeSlot,
          status: { $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
        });
        if (customerClash) continue;

        const serviceClash = await Appointment.exists({
          serviceId: service._id,
          appointmentDate,
          timeSlot,
          status: { $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
        });
        if (serviceClash) continue;
      }

      try {
        await Appointment.create({
          serviceId: service._id,
          customerId,
          appointmentDate,
          timeSlot,
          message: DEMO_APPOINTMENT_MESSAGE,
          servicePrice: service.price,
          paymentStatus: PaymentStatus.UNPAID,
          status,
        });
        created += 1;
        placed = true;
      } catch (error: any) {
        if (error?.code === 11000) {
          // Slot claimed concurrently or by a partial unique index: try next slot.
          continue;
        }
        throw error;
      }
    }

    if (!placed) {
      skipped += 1;
      console.warn(`Skipped appointment #${index + 1}: no free slot found`);
    }
  }

  return { created, skipped, serviceIds, customerIds };
};

const logSummary = async (
  services: { created: number; skipped: number },
  customers: { created: number; skipped: number },
  appointments: { created: number; skipped: number }
) => {
  const serviceCount = await Service.countDocuments({});
  const demoServiceCount = await Service.countDocuments({ serviceName: DEMO_SERVICE_NAME_PATTERN });
  const demoCustomerCount = await User.countDocuments({ email: { $regex: '^demo\\.customer\\d+@example\\.com$' } });
  const demoAppointmentCount = await Appointment.countDocuments({ message: DEMO_APPOINTMENT_MESSAGE });

  const statusBreakdown = await Appointment.aggregate([
    { $match: { message: DEMO_APPOINTMENT_MESSAGE } },
    { $group: { _id: { status: '$status', paymentStatus: '$paymentStatus' }, count: { $sum: 1 } } },
    { $sort: { '_id.status': 1 } },
  ]);

  const paidDemo = await Appointment.countDocuments({
    message: DEMO_APPOINTMENT_MESSAGE,
    paymentStatus: PaymentStatus.PAID,
  });

  const badRefs = await Appointment.aggregate([
    { $match: { message: DEMO_APPOINTMENT_MESSAGE } },
    {
      $lookup: { from: 'services', localField: 'serviceId', foreignField: '_id', as: 'service' },
    },
    {
      $lookup: { from: 'user', localField: 'customerId', foreignField: '_id', as: 'customer' },
    },
    { $match: { 'service': { $size: 0 }, 'customer': { $size: 0 } } },
    { $count: 'broken' },
  ]);

  const transactionCount = await Transaction.countDocuments({});

  console.log('\n--- seed summary ---');
  console.log(`services created: ${services.created} (skipped ${services.skipped})`);
  console.log(`demo customers created: ${customers.created} (skipped ${customers.skipped})`);
  console.log(`demo appointments created: ${appointments.created} (skipped ${appointments.skipped})`);
  console.log(`total services in db: ${serviceCount} (demo: ${demoServiceCount})`);
  console.log(`demo customers in db: ${demoCustomerCount}`);
  console.log(`demo appointments in db: ${demoAppointmentCount}`);
  console.log('demo appointment status/payment breakdown:');
  for (const row of statusBreakdown) {
    console.log(`  - ${row._id.status}/${row._id.paymentStatus}: ${row.count}`);
  }
  console.log(`demo appointments marked paid (must be 0): ${paidDemo}`);
  console.log(`demo appointments with broken refs (must be 0): ${badRefs[0]?.broken ?? 0}`);
  console.log(`transaction documents (unchanged, no demo transactions created): ${transactionCount}`);
  console.log(`categories represented: ${SERVICE_CATEGORIES.length}`);

  if (paidDemo !== 0) {
    throw new Error('Refusing to finish: a demo appointment is marked paid');
  }
  if ((badRefs[0]?.broken ?? 0) !== 0) {
    throw new Error('Refusing to finish: demo appointment references do not resolve');
  }
};

const run = async () => {
  const password = process.env.DEMO_SEED_PASSWORD;
  if (!password) {
    throw new Error('DEMO_SEED_PASSWORD must be set in the environment before seeding demo customers');
  }

  await mongoose.connect(config.mongodb.uri);
  console.log('Connected to MongoDB');

  const before = {
    services: await Service.countDocuments({}),
    customers: await User.countDocuments({}),
    appointments: await Appointment.countDocuments({}),
    transactions: await Transaction.countDocuments({}),
  };
  console.log(
    `existing counts -> services: ${before.services}, users: ${before.customers}, appointments: ${before.appointments}, transactions: ${before.transactions}`
  );

  const services = await seedServices();
  const customers = await seedDemoCustomers(password);
  const appointments = await seedAppointments();
  await logSummary(services, customers, appointments);

  console.log('Demo seed finished successfully');
};

run()
  .then(() => process.exit(0))
  .catch(async error => {
    console.error('SEED ERROR:', error instanceof Error ? error.message : error);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect failures
    }
    process.exit(1);
  });