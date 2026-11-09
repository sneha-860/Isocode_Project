CREATE TRIGGER booking_terms_guard BEFORE INSERT ON bookings BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM rate_plans p WHERE p.id=NEW.plan_id AND p.active=1 AND p.adjustment=NEW.plan_adjustment)
 THEN RAISE(ABORT,'rate_plan_changed') END;
 SELECT CASE WHEN (NEW.promo_code IS NULL AND NEW.discount_percent!=0) OR
 (NEW.promo_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM promos p WHERE p.code=NEW.promo_code AND p.active=1
 AND p.percent=NEW.discount_percent AND p.valid_from<=NEW.arrival AND p.valid_until>=date(NEW.departure,'-1 day')
 AND p.min_nights<=julianday(NEW.departure)-julianday(NEW.arrival)
 AND (SELECT count(*) FROM bookings b WHERE b.promo_code=p.code)<p.max_uses))
 THEN RAISE(ABORT,'promo_changed_or_exhausted') END;
END;
--> statement-breakpoint
CREATE TRIGGER nightly_quote_guard BEFORE INSERT ON nights BEGIN
 SELECT CASE WHEN NEW.net_rate IS NULL OR NEW.tax IS NULL OR NOT EXISTS (
 SELECT 1 FROM bookings b WHERE b.id=NEW.booking_id
 AND NEW.net_rate=NEW.rate+b.plan_adjustment-CAST((NEW.rate+b.plan_adjustment)*b.discount_percent/100.0+0.5 AS INTEGER)
 AND NEW.tax=CAST(NEW.net_rate*(CASE WHEN NEW.net_rate<=750000 THEN 0.05 ELSE 0.18 END)+0.5 AS INTEGER))
 THEN RAISE(ABORT,'nightly_quote_changed') END;
END;
--> statement-breakpoint
CREATE TRIGGER promo_terms_guard BEFORE UPDATE ON promos BEGIN
 SELECT CASE WHEN NEW.percent<1 OR NEW.percent>50 OR NEW.min_nights<1 OR NEW.min_nights>14 OR NEW.active NOT IN (0,1)
 OR NEW.max_uses<(SELECT count(*) FROM bookings WHERE promo_code=NEW.code) OR NEW.valid_until<NEW.valid_from
 THEN RAISE(ABORT,'invalid_promo_terms') END;
END;
--> statement-breakpoint
CREATE INDEX bookings_daily_export ON bookings(created);
