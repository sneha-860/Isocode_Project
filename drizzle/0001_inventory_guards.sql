CREATE INDEX nights_stock ON nights(room_id,date);
--> statement-breakpoint
CREATE INDEX audit_throttle ON audit(action,detail,created);
--> statement-breakpoint
CREATE INDEX enquiry_throttle ON enquiries(email,created);
--> statement-breakpoint
CREATE TRIGGER night_guard BEFORE INSERT ON nights BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM inventory i JOIN bookings b ON b.id=NEW.booking_id JOIN rooms r ON r.id=i.room_id
  WHERE i.room_id=NEW.room_id AND i.date=NEW.date AND i.blackout=0 AND i.rate=NEW.rate
  AND b.room_id=NEW.room_id AND NEW.date>=b.arrival AND NEW.date<b.departure AND b.guests<=r.capacity
  AND (SELECT count(*) FROM nights n WHERE n.room_id=NEW.room_id AND n.date=NEW.date)<i.allotment
 ) THEN RAISE(ABORT,'stock_or_rate_changed') END;
END;
--> statement-breakpoint
CREATE TRIGGER allotment_guard BEFORE UPDATE ON inventory BEGIN
 SELECT CASE WHEN NEW.allotment<(SELECT count(*) FROM nights WHERE room_id=NEW.room_id AND date=NEW.date)
 OR NEW.allotment<0 OR NEW.allotment>(SELECT keys FROM rooms WHERE id=NEW.room_id)
 OR NEW.rate<100000 OR NEW.rate>10000000 OR NEW.blackout NOT IN (0,1)
 THEN RAISE(ABORT,'invalid_inventory') END;
END;
