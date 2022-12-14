import prisma from "common/prisma";
import { patchCalendarEvent } from "common/google/calendar";
import { scheduleNextCheckin } from "common/events";
import { getSlug } from "common/slug";

export async function handleEvents(gcalEvents) {
  const gcalEventIds = Object.keys(gcalEvents);
  if (gcalEventIds.length === 0) return;
  const events = await prisma.event.findMany({
    where: { gcal_event_id: { in: gcalEventIds } },
  });

  // create a new Event if it wasn't found in the database
  const toCreate = new Set(gcalEventIds);
  for (const record of events) {
    toCreate.delete(record.gcal_event_id);
  }

  toCreate.forEach(
    async (eventId) => await handleCreateEvent(gcalEvents, eventId)
  );

  for (const record of events) {
    const gcalEvent = gcalEvents[record.gcal_event_id];
    await prisma.event.update({
      where: { gcal_event_id: gcalEvent.id },
      data: {
        all_day: gcalEvent.start?.date ? true : undefined,
        status: gcalEvent.status.toUpperCase(),
        start_time: gcalEvent.start
          ? new Date(gcalEvent.start.dateTime || gcalEvent.start.date)
          : undefined,
        end_time: gcalEvent.end
          ? new Date(gcalEvent.end.dateTime || gcalEvent.end.date)
          : undefined,
        recurrence: gcalEvent.recurrence,
        title: gcalEvent.summary,
        description: gcalEvent.description,
        timezone: gcalEvent.start?.timeZone,
      },
    });

    await scheduleNextCheckin(record.id);
  }
}

export async function handleExceptions(gcalEvents) {
  const gcalEventIds = Object.keys(gcalEvents);
  if (gcalEventIds.length === 0) return;
  const eventExceptions = await prisma.eventException.findMany({
    where: { gcal_event_id: { in: gcalEventIds } },
  });

  // create a new EventException if it wasn't found in the database
  const toCreate = new Set(gcalEventIds);
  for (const record of eventExceptions) {
    toCreate.delete(record.gcal_event_id);
  }

  toCreate.forEach(
    async (eventId) => await handleCreateException(gcalEvents, eventId)
  );

  for (const record of eventExceptions) {
    const gcalEvent = gcalEvents[record.gcal_event_id];
    await prisma.eventException.update({
      where: { gcal_event_id: gcalEvent.id },
      data: {
        all_day: gcalEvent.start?.date ? true : false,
        status: gcalEvent.status.toUpperCase(),
        start_time: gcalEvent.start
          ? new Date(gcalEvent.start.dateTime || gcalEvent.start.date)
          : undefined,
        end_time: gcalEvent.end
          ? new Date(gcalEvent.end.dateTime || gcalEvent.end.date)
          : undefined,
        title: gcalEvent.summary,
        description: gcalEvent.description,
      },
    });

    await scheduleNextCheckin(record.event_id);
  }
}

export async function handleCreateEvent(gcalEvents, gcalEventId) {
  const gcalEvent = gcalEvents[gcalEventId];
  try {
    var event_id = BigInt(
      gcalEvent.extendedProperties?.private?.meetbot_event_id
    );
  } catch (err) {
    console.log("Invalid event_id", gcalEvent.extendedProperties?.private);
    return;
  }

  const oldEvent = await prisma.event.findUnique({
    where: {
      id: event_id,
    },
    include: {
      participants: {
        where: { event_time: new Date(0) },
        select: {
          user_id: true,
          event_time: true,
          added_by_id: true,
          is_active: true,
        },
      },
      project: {
        select: {
          gcal_calendar_id: true,
        },
      },
    },
  });

  if (!oldEvent) {
    console.log("event not found", { event_id });
    return;
  }

  const newEvent = await prisma.event.create({
    data: {
      all_day: gcalEvent.start?.date ? true : false,
      created_by_id: oldEvent.created_by_id,
      start_time: new Date(gcalEvent.start.dateTime || gcalEvent.start.date),
      end_time: new Date(gcalEvent.end.dateTime || gcalEvent.end.date),
      gcal_event_id: gcalEvent.id,
      project_id: oldEvent.project_id,
      slack_channel_id: oldEvent.slack_channel_id,
      slack_team_id: oldEvent.slack_team_id,
      recurrence: gcalEvent.recurrence,
      title: gcalEvent.summary,
      timezone: gcalEvent.start.timeZone,
      description: gcalEvent.description,
      slug: getSlug(gcalEvent.summary),
      participants: { create: oldEvent.participants },
    },
  });

  await patchCalendarEvent(gcalEvent.id, oldEvent.project.gcal_calendar_id, {
    extendedProperties: {
      private: {
        meetbot_event_id: newEvent.id.toString(),
        meetbot_project_id: newEvent.project_id.toString(),
      },
    },
  });

  await scheduleNextCheckin(newEvent.id);
}

export async function handleCreateException(gcalExceptions, gcalEventId) {
  const gcalEvent = gcalExceptions[gcalEventId];
  const record = await prisma.event.findUnique({
    where: { gcal_event_id: gcalEvent.recurringEventId },
  });

  if (!record) {
    console.log("event not found", {
      gcal_event_id: gcalEvent.recurringEventId,
    });
    return;
  }

  const row = {
    event_id: record.id,
    original_start_time: new Date(
      gcalEvent.originalStartTime.dateTime || gcalEvent.originalStartTime.date
    ),
    all_day: gcalEvent.start?.date ? true : false,
    start_time: gcalEvent.start
      ? new Date(gcalEvent.start.dateTime || gcalEvent.start.date)
      : undefined,
    end_time: gcalEvent.end
      ? new Date(gcalEvent.end.dateTime || gcalEvent.end.date)
      : undefined,
    gcal_event_id: gcalEvent.id,
    title: gcalEvent.summary,
    description: gcalEvent.description,
    status: gcalEvent.status.toUpperCase(),
  };

  await prisma.eventException.upsert({
    where: {
      event_id_original_start_time: {
        event_id: record.id,
        original_start_time: new Date(
          gcalEvent.originalStartTime.dateTime ||
            gcalEvent.originalStartTime.date
        ),
      },
    },
    create: row,
    update: row,
  });

  await scheduleNextCheckin(record.id);
}
