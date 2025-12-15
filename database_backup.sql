--
-- PostgreSQL database dump
--

\restrict tHd9MlFVWO8k7kbJ9qBwQvXYH62nQxOmh6OhfL3gwKwx8q4WdSkGAkEHcYggVkU

-- Dumped from database version 16.11 (b740647)
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: generate_ci_number(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.generate_ci_number() RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE
    current_year integer := EXTRACT(YEAR FROM NOW());
    next_num integer;
    max_number text;
BEGIN
    -- Find highest number for current year
    SELECT invoice_number INTO max_number
    FROM invoices 
    WHERE invoice_number ~ ('^CI-' || current_year || '-[0-9]{3}$')
    ORDER BY invoice_number DESC 
    LIMIT 1;
    
    IF max_number IS NULL THEN
        next_num := 1;
    ELSE
        next_num := (regexp_match(max_number, 'CI-' || current_year || '-([0-9]{3})'))[1]::integer + 1;
    END IF;
    
    RETURN 'CI-' || current_year || '-' || LPAD(next_num::text, 3, '0');
END;
$_$;


ALTER FUNCTION public.generate_ci_number() OWNER TO neondb_owner;

--
-- Name: generate_invoice_number(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.generate_invoice_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_year INTEGER;
    next_number INTEGER;
    result_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Find the highest number for the current year
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(i.invoice_number FROM 'INV-\d{4}-(\d{3})') AS INTEGER)), 
        0
    ) + 1
    INTO next_number
    FROM invoices i
    WHERE i.invoice_number ~ ('INV-' || current_year || '-\d{3}');
    
    -- Generate the invoice number
    result_number := 'INV-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN result_number;
END;
$$;


ALTER FUNCTION public.generate_invoice_number() OWNER TO neondb_owner;

--
-- Name: generate_packing_list_number(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.generate_packing_list_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_year INTEGER;
    next_number INTEGER;
    result_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Find the highest number for the current year
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(pl.packing_number FROM 'PACK-\d{4}-(\d{3})') AS INTEGER)), 
        0
    ) + 1
    INTO next_number
    FROM packing_lists pl
    WHERE pl.packing_number ~ ('PACK-' || current_year || '-\d{3}');
    
    -- Generate the packing list number
    result_number := 'PACK-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN result_number;
END;
$$;


ALTER FUNCTION public.generate_packing_list_number() OWNER TO neondb_owner;

--
-- Name: generate_proforma_invoice_number(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.generate_proforma_invoice_number() RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE
    current_year integer := EXTRACT(YEAR FROM NOW());
    next_num integer;
    max_number text;
BEGIN
    -- Find highest number for current year in proforma invoices
    SELECT proforma_number INTO max_number
    FROM proforma_invoices 
    WHERE proforma_number ~ ('^PRI-' || current_year || '-[0-9]{3}$')
    ORDER BY proforma_number DESC 
    LIMIT 1;
    
    IF max_number IS NULL THEN
        next_num := 1;
    ELSE
        next_num := (regexp_match(max_number, 'PRI-' || current_year || '-([0-9]{3})'))[1]::integer + 1;
    END IF;
    
    RETURN 'PRI-' || current_year || '-' || LPAD(next_num::text, 3, '0');
END;
$_$;


ALTER FUNCTION public.generate_proforma_invoice_number() OWNER TO neondb_owner;

--
-- Name: generate_purchase_order_number(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.generate_purchase_order_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_year INTEGER;
    next_number INTEGER;
    result_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Find the highest number for the current year
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(po.order_number FROM 'PO-\d{4}-(\d{3})') AS INTEGER)), 
        0
    ) + 1
    INTO next_number
    FROM purchase_orders po
    WHERE po.order_number ~ ('PO-' || current_year || '-\d{3}');
    
    -- Generate the purchase order number
    result_number := 'PO-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN result_number;
END;
$$;


ALTER FUNCTION public.generate_purchase_order_number() OWNER TO neondb_owner;

--
-- Name: generate_quotation_number(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.generate_quotation_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_year INTEGER;
    next_number INTEGER;
    result_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Find the highest number for the current year
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(q.quotation_number FROM 'Q-\d{4}-(\d{3})') AS INTEGER)), 
        0
    ) + 1
    INTO next_number
    FROM quotations q
    WHERE q.quotation_number ~ ('Q-' || current_year || '-\d{3}');
    
    -- Generate the quotation number
    result_number := 'Q-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN result_number;
END;
$$;


ALTER FUNCTION public.generate_quotation_number() OWNER TO neondb_owner;

--
-- Name: generate_quotation_request_number(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.generate_quotation_request_number() RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE
    current_year integer := EXTRACT(YEAR FROM NOW());
    next_num integer;
    max_number text;
BEGIN
    -- Find highest number for current year
    SELECT request_number INTO max_number
    FROM quotation_requests 
    WHERE request_number ~ ('^QR-' || current_year || '-[0-9]{3}$')
    ORDER BY request_number DESC 
    LIMIT 1;
    
    IF max_number IS NULL THEN
        next_num := 1;
    ELSE
        next_num := (regexp_match(max_number, 'QR-' || current_year || '-([0-9]{3})'))[1]::integer + 1;
    END IF;
    
    RETURN 'QR-' || current_year || '-' || LPAD(next_num::text, 3, '0');
END;
$_$;


ALTER FUNCTION public.generate_quotation_request_number() OWNER TO neondb_owner;

--
-- Name: generate_work_order_number(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.generate_work_order_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_year INTEGER;
    next_number INTEGER;
    result_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Find the highest number for the current year
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(wo.order_number FROM 'WO-\d{4}-(\d{3})') AS INTEGER)), 
        0
    ) + 1
    INTO next_number
    FROM work_orders wo
    WHERE wo.order_number ~ ('WO-' || current_year || '-\d{3}');
    
    -- Generate the work order number
    result_number := 'WO-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN result_number;
END;
$$;


ALTER FUNCTION public.generate_work_order_number() OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.addresses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    street text NOT NULL,
    house_number text NOT NULL,
    postal_code text NOT NULL,
    city text NOT NULL,
    country text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.addresses OWNER TO neondb_owner;

--
-- Name: cities; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.cities (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    postal_code text NOT NULL,
    country text NOT NULL,
    region text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cities OWNER TO neondb_owner;

--
-- Name: company_profiles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.company_profiles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    logo_url text,
    street text,
    house_number text,
    postal_code text,
    city text,
    country text DEFAULT 'Netherlands'::text,
    phone text,
    email text,
    website text,
    kvk_nummer text,
    btw_nummer text,
    bank_account text,
    bank_name text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.company_profiles OWNER TO neondb_owner;

--
-- Name: countries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.countries (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    requires_btw boolean DEFAULT false,
    requires_area_code boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.countries OWNER TO neondb_owner;

--
-- Name: customer_contacts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.customer_contacts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    customer_id character varying,
    first_name text NOT NULL,
    last_name text NOT NULL,
    date_of_birth timestamp without time zone,
    email text,
    phone text,
    mobile jsonb DEFAULT '[]'::jsonb,
    "position" text,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.customer_contacts OWNER TO neondb_owner;

--
-- Name: customer_number_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.customer_number_seq
    START WITH 6
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_number_seq OWNER TO neondb_owner;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.customers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    customer_number text DEFAULT concat('DEB-', lpad((nextval('public.customer_number_seq'::regclass))::text, 4, '0'::text)) NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    mobile text,
    address_id character varying,
    contact_person_email text,
    tax_id text,
    bank_account text,
    language text DEFAULT 'nl'::text,
    payment_terms integer DEFAULT 30,
    status text DEFAULT 'active'::text,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    kvk_nummer text,
    country_code text,
    area_code text,
    general_email text,
    invoice_email text,
    invoice_notes text,
    memo text,
    language_code text DEFAULT 'nl'::text,
    payment_days_id character varying,
    payment_schedule_id character varying
);


ALTER TABLE public.customers OWNER TO neondb_owner;

--
-- Name: document_layout_fields; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.document_layout_fields (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    document_type text NOT NULL,
    field_key text NOT NULL,
    label text NOT NULL,
    data_type text NOT NULL,
    category text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.document_layout_fields OWNER TO neondb_owner;

--
-- Name: document_layouts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.document_layouts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    document_type text NOT NULL,
    name text NOT NULL,
    page_format text DEFAULT 'A4'::text NOT NULL,
    orientation text DEFAULT 'portrait'::text NOT NULL,
    is_default boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    allowed_tables jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.document_layouts OWNER TO neondb_owner;

--
-- Name: images; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.images (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    category text DEFAULT 'general'::text,
    image_data text NOT NULL,
    width integer,
    height integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.images OWNER TO neondb_owner;

--
-- Name: incoterms; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.incoterms (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.incoterms OWNER TO neondb_owner;

--
-- Name: inventory_components; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_components (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    parent_item_id character varying NOT NULL,
    component_item_id character varying NOT NULL,
    quantity numeric(10,3) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.inventory_components OWNER TO neondb_owner;

--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sku text NOT NULL,
    description text,
    category text,
    unit text DEFAULT 'pcs'::text,
    unit_price numeric(10,2) NOT NULL,
    current_stock integer DEFAULT 0,
    minimum_stock integer DEFAULT 0,
    status text DEFAULT 'active'::text,
    created_at timestamp without time zone DEFAULT now(),
    cost_price numeric(10,2) DEFAULT '0'::numeric,
    margin numeric(5,2) DEFAULT '0'::numeric,
    image text,
    is_composite boolean DEFAULT false
);


ALTER TABLE public.inventory_items OWNER TO neondb_owner;

--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.invoice_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_id character varying NOT NULL,
    item_id character varying,
    description text NOT NULL,
    quantity integer DEFAULT 0,
    unit_price numeric(10,2) DEFAULT 0.00,
    line_total numeric(10,2) DEFAULT 0.00,
    line_type text DEFAULT 'standard'::text,
    "position" integer DEFAULT 0,
    source_snippet_id character varying,
    source_snippet_version integer
);


ALTER TABLE public.invoice_items OWNER TO neondb_owner;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.invoices (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text DEFAULT public.generate_ci_number() NOT NULL,
    customer_id character varying NOT NULL,
    quotation_id character varying,
    project_id character varying,
    status text DEFAULT 'pending'::text,
    due_date timestamp without time zone,
    subtotal numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT '0'::numeric,
    total_amount numeric(10,2) NOT NULL,
    paid_amount numeric(10,2) DEFAULT '0'::numeric,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.invoices OWNER TO neondb_owner;

--
-- Name: languages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.languages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.languages OWNER TO neondb_owner;

--
-- Name: layout_blocks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.layout_blocks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    block_type text NOT NULL,
    label text NOT NULL,
    default_config jsonb DEFAULT '{}'::jsonb,
    compatible_document_types jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.layout_blocks OWNER TO neondb_owner;

--
-- Name: layout_elements; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.layout_elements (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    section_id character varying NOT NULL,
    element_type text NOT NULL,
    field_key text,
    block_id character varying,
    x_position numeric(10,2) NOT NULL,
    y_position numeric(10,2) NOT NULL,
    width numeric(10,2),
    height numeric(10,2),
    style jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.layout_elements OWNER TO neondb_owner;

--
-- Name: layout_sections; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.layout_sections (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    layout_id character varying NOT NULL,
    section_type text NOT NULL,
    "position" integer NOT NULL,
    allow_multiple boolean DEFAULT false,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    name text NOT NULL
);


ALTER TABLE public.layout_sections OWNER TO neondb_owner;

--
-- Name: packing_list_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.packing_list_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    packing_list_id character varying NOT NULL,
    item_id character varying NOT NULL,
    quantity integer NOT NULL,
    packed_quantity integer DEFAULT 0
);


ALTER TABLE public.packing_list_items OWNER TO neondb_owner;

--
-- Name: packing_list_number_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.packing_list_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.packing_list_number_seq OWNER TO neondb_owner;

--
-- Name: packing_lists; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.packing_lists (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    packing_number text DEFAULT concat('PL-', lpad((nextval('public.packing_list_number_seq'::regclass))::text, 4, '0'::text)) NOT NULL,
    invoice_id character varying,
    project_id character varying,
    customer_id character varying NOT NULL,
    status text DEFAULT 'pending'::text,
    shipping_address text,
    shipping_method text,
    tracking_number text,
    weight numeric(8,2),
    dimensions text,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.packing_lists OWNER TO neondb_owner;

--
-- Name: payment_days; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payment_days (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    days integer NOT NULL,
    name_nl text NOT NULL,
    name_en text NOT NULL,
    description_nl text,
    description_en text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payment_days OWNER TO neondb_owner;

--
-- Name: payment_schedules; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payment_schedules (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name_nl text NOT NULL,
    name_en text NOT NULL,
    schedule_items jsonb NOT NULL,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payment_schedules OWNER TO neondb_owner;

--
-- Name: payment_terms; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payment_terms (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    days integer NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payment_terms OWNER TO neondb_owner;

--
-- Name: proforma_invoices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.proforma_invoices (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    proforma_number text DEFAULT public.generate_proforma_invoice_number() NOT NULL,
    customer_id character varying NOT NULL,
    quotation_id character varying,
    project_id character varying,
    status text DEFAULT 'pending'::text,
    due_date timestamp without time zone,
    subtotal numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT '0'::numeric,
    total_amount numeric(10,2) NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.proforma_invoices OWNER TO neondb_owner;

--
-- Name: project_number_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.project_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_number_seq OWNER TO neondb_owner;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.projects (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    customer_id character varying,
    status text DEFAULT 'planning'::text,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    total_value numeric(10,2),
    progress integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    project_number text DEFAULT concat('PR-', lpad((nextval('public.project_number_seq'::regclass))::text, 4, '0'::text)) NOT NULL
);


ALTER TABLE public.projects OWNER TO neondb_owner;

--
-- Name: prospect_number_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.prospect_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prospect_number_seq OWNER TO neondb_owner;

--
-- Name: prospects; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.prospects (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    prospect_number text DEFAULT concat('PROS-', lpad((nextval('public.prospect_number_seq'::regclass))::text, 4, '0'::text)) NOT NULL,
    first_name text,
    last_name text,
    company_name text NOT NULL,
    email text,
    phone text,
    mobile text,
    "position" text,
    industry text,
    source text,
    status text DEFAULT 'new'::text,
    priority text DEFAULT 'medium'::text,
    estimated_value numeric(10,2),
    notes text,
    assigned_to text,
    next_follow_up timestamp without time zone,
    last_contact_date timestamp without time zone,
    conversion_date timestamp without time zone,
    customer_id character varying,
    address_id character varying,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.prospects OWNER TO neondb_owner;

--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.purchase_order_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id character varying NOT NULL,
    item_id character varying NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    line_total numeric(10,2) NOT NULL
);


ALTER TABLE public.purchase_order_items OWNER TO neondb_owner;

--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.purchase_orders (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_number text DEFAULT public.generate_purchase_order_number() NOT NULL,
    supplier_id character varying NOT NULL,
    status text DEFAULT 'pending'::text,
    order_date timestamp without time zone DEFAULT now(),
    expected_date timestamp without time zone,
    subtotal numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT '0'::numeric,
    total_amount numeric(10,2) NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.purchase_orders OWNER TO neondb_owner;

--
-- Name: quotation_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quotation_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    quotation_id character varying NOT NULL,
    item_id character varying,
    description text NOT NULL,
    quantity integer DEFAULT 0,
    unit_price numeric(10,2) DEFAULT 0.00,
    line_total numeric(10,2) DEFAULT 0.00,
    line_type text DEFAULT 'standard'::text,
    "position" integer DEFAULT 0,
    source_snippet_id character varying,
    source_snippet_version integer
);


ALTER TABLE public.quotation_items OWNER TO neondb_owner;

--
-- Name: quotation_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quotation_requests (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    request_number text DEFAULT public.generate_quotation_request_number() NOT NULL,
    customer_id character varying NOT NULL,
    project_id character varying,
    status text DEFAULT 'pending'::text,
    request_date timestamp without time zone DEFAULT now(),
    due_date timestamp without time zone,
    title text NOT NULL,
    description text,
    requirements text,
    estimated_budget numeric(10,2),
    priority text DEFAULT 'medium'::text,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.quotation_requests OWNER TO neondb_owner;

--
-- Name: quotations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quotations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    quotation_number text DEFAULT public.generate_quotation_number() NOT NULL,
    customer_id character varying NOT NULL,
    project_id character varying,
    status text DEFAULT 'draft'::text,
    quotation_date timestamp without time zone DEFAULT now(),
    description text,
    revision_number text DEFAULT 'V1.0'::text,
    valid_until timestamp without time zone,
    subtotal numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT '0'::numeric,
    total_amount numeric(10,2) NOT NULL,
    notes text,
    inco_terms text,
    payment_conditions text,
    delivery_conditions text,
    created_at timestamp without time zone DEFAULT now(),
    validity_days integer DEFAULT 30,
    is_budget_quotation boolean DEFAULT false
);


ALTER TABLE public.quotations OWNER TO neondb_owner;

--
-- Name: sales_order_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sales_order_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    sales_order_id character varying NOT NULL,
    item_id character varying,
    quantity integer DEFAULT 0,
    unit_price numeric(10,2) DEFAULT 0.00,
    line_total numeric(10,2) DEFAULT 0.00,
    description text NOT NULL,
    line_type text DEFAULT 'standard'::text,
    "position" integer DEFAULT 0,
    source_snippet_id character varying,
    source_snippet_version integer
);


ALTER TABLE public.sales_order_items OWNER TO neondb_owner;

--
-- Name: sales_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sales_orders (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    customer_id character varying NOT NULL,
    status text DEFAULT 'pending'::text,
    order_date timestamp without time zone DEFAULT now(),
    expected_delivery_date timestamp without time zone,
    subtotal numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT '0'::numeric,
    total_amount numeric(10,2) NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sales_orders OWNER TO neondb_owner;

--
-- Name: statuses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.statuses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    color text,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.statuses OWNER TO neondb_owner;

--
-- Name: supplier_number_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.supplier_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplier_number_seq OWNER TO neondb_owner;

--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.suppliers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    supplier_number text DEFAULT concat('CRED-', lpad((nextval('public.supplier_number_seq'::regclass))::text, 3, '0'::text)) NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    contact_person text,
    tax_id text,
    payment_terms integer DEFAULT 30,
    status text DEFAULT 'active'::text,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.suppliers OWNER TO neondb_owner;

--
-- Name: text_snippet_usages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.text_snippet_usages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    snippet_id character varying NOT NULL,
    doc_type text NOT NULL,
    doc_id character varying NOT NULL,
    doc_line_id character varying NOT NULL,
    version_used integer NOT NULL,
    used_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.text_snippet_usages OWNER TO neondb_owner;

--
-- Name: text_snippets; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.text_snippets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    category text DEFAULT 'general'::text,
    locale text DEFAULT 'nl'::text,
    version integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.text_snippets OWNER TO neondb_owner;

--
-- Name: units_of_measure; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.units_of_measure (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.units_of_measure OWNER TO neondb_owner;

--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_preferences (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying,
    navigation_order jsonb,
    collapsed_sections jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    last_active_tab character varying(255),
    last_active_tab_type character varying(50)
);


ALTER TABLE public.user_preferences OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    email text,
    role text DEFAULT 'user'::text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: vat_rates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.vat_rates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    rate numeric(5,2) NOT NULL,
    country text DEFAULT 'NL'::text,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.vat_rates OWNER TO neondb_owner;

--
-- Name: work_order_number_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.work_order_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.work_order_number_seq OWNER TO neondb_owner;

--
-- Name: work_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.work_orders (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_number text DEFAULT concat('WO-', lpad((nextval('public.work_order_number_seq'::regclass))::text, 4, '0'::text)) NOT NULL,
    project_id character varying,
    title text NOT NULL,
    description text,
    assigned_to text,
    status text DEFAULT 'pending'::text,
    priority text DEFAULT 'medium'::text,
    start_date timestamp without time zone,
    due_date timestamp without time zone,
    completed_date timestamp without time zone,
    estimated_hours integer,
    actual_hours integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.work_orders OWNER TO neondb_owner;

--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.addresses (id, street, house_number, postal_code, city, country, created_at) FROM stdin;
07756d8b-f111-42ba-8511-3900c45aaa81	Uddel	1	3853	UDdel	Nederland	2025-09-15 08:49:12.26326
\.


--
-- Data for Name: cities; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.cities (id, name, postal_code, country, region, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: company_profiles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.company_profiles (id, name, logo_url, street, house_number, postal_code, city, country, phone, email, website, kvk_nummer, btw_nummer, bank_account, bank_name, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: countries; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.countries (id, code, name, requires_btw, requires_area_code, created_at) FROM stdin;
45f366c5-b82e-452d-88b6-b416d57aed4e	NL	Netherlands	t	f	2025-09-12 18:43:43.39488
d1c7db26-8259-4817-b255-477512ab1400	ET	Ethiopia	f	t	2025-09-12 18:43:43.428018
\.


--
-- Data for Name: customer_contacts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customer_contacts (id, customer_id, first_name, last_name, date_of_birth, email, phone, mobile, "position", is_primary, created_at) FROM stdin;
0c326b39-23d1-411e-b7be-54e19c4654ea	1698a4d0-7d34-4685-b256-1d0cf6e5200b	Jan	de Vries	\N	jan@testbedrijf.nl	+31 6 12345678	[]	Manager	t	2025-09-10 08:42:34.063573
bcb534b1-7334-4d3f-8993-581fde9de991	84d6a39c-c26b-4ecf-84b6-b8ee09f0f3b9	Sarah	Johnson	\N	sarah@abc.com	+31 6 87654321	[]	Director	t	2025-09-10 08:42:34.063573
ced662cc-d6ac-4bf3-8834-dbd56384da89	22d4c5bc-711e-4b99-b85a-5e31a0098d20	Mike	Chen	\N	mike@xyz.nl	+31 6 55512345	[]	CEO	t	2025-09-10 08:42:34.063573
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customers (id, customer_number, name, email, phone, mobile, address_id, contact_person_email, tax_id, bank_account, language, payment_terms, status, deleted_at, created_at, kvk_nummer, country_code, area_code, general_email, invoice_email, invoice_notes, memo, language_code, payment_days_id, payment_schedule_id) FROM stdin;
1698a4d0-7d34-4685-b256-1d0cf6e5200b	DEB-0001	Test Bedrijf BV	contact@testbedrijf.nl	\N	\N	\N	\N	\N	\N	nl	30	active	\N	2025-09-10 08:42:14.851739	\N	\N	\N	\N	\N	\N	\N	nl	\N	\N
1fa3cea5-adb6-4ca4-9649-453689a75f12	DEB-0004	ATE Solutions B.V.	info@atesolutions.nl	+31682332087	\N	\N	\N	\N	\N	nl	30	prospect	\N	2025-09-10 11:28:48.841332	\N	\N	\N	\N	\N	\N	\N	nl	\N	\N
a476ef35-b76b-41de-80bc-0e19310508b4	DEB-0005	Friendship flowers			\N	\N	\N	\N	\N	nl	7	active	\N	2025-09-11 21:45:33.771207	\N	\N	\N	\N	\N	\N	\N	nl	\N	\N
84d6a39c-c26b-4ecf-84b6-b8ee09f0f3b9	DEB-0002	ABC Company	info@abc.com	\N	\N	\N	\N	\N	\N	en	30	active	\N	2025-09-10 08:42:14.851739	\N	\N	\N	\N	\N	\N	\N	nl	\N	\N
22d4c5bc-711e-4b99-b85a-5e31a0098d20	DEB-0003	XYZ Solutions	hello@xyz.nl	\N	\N	\N	\N	\N	\N	nl	15	active	\N	2025-09-10 08:42:14.851739	\N	\N	\N	\N	\N	\N	\N	nl	\N	\N
f84688d8-f126-4020-8602-f5afdc709b16	DEB-0008	MGS 				07756d8b-f111-42ba-8511-3900c45aaa81		NL345678901B01		nl	30	active	\N	2025-09-15 08:49:23.20422	12345678	NL					\N	nl	\N	\N
5550d00f-b791-4e21-ac1e-ca0700d5ac65	DEB-0009	Test Customer CRUD	test@crud.com	\N	\N	\N	\N	\N	\N	nl	30	active	\N	2025-09-17 15:42:44.426943	\N	\N	\N	\N	\N	\N	\N	nl	\N	\N
26188fba-4c83-451c-b8c1-6cc9a75e9606	DEB-0010		\N	\N	\N	\N	\N	\N	\N	nl	30	active	\N	2025-09-17 15:43:03.918922	\N	\N	\N	\N	\N	\N	\N	nl	\N	\N
\.


--
-- Data for Name: document_layout_fields; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.document_layout_fields (id, document_type, field_key, label, data_type, category, created_at) FROM stdin;
dd8431a8-1c58-411a-bb56-c975baa6ab54	quotation	quotation.number	Quotation Number	text	quotation	2025-11-09 08:17:24.738005
4ffbbc4e-b53e-42be-a3dd-3fc8f98c35d2	quotation	quotation.date	Quotation Date	date	quotation	2025-11-09 08:17:24.738005
19a78f01-bfb9-4729-8526-c9c87a830b31	quotation	quotation.validUntil	Valid Until	date	quotation	2025-11-09 08:17:24.738005
f0c05617-b9ce-4997-b2fb-ca45b2c05337	quotation	quotation.description	Description	text	quotation	2025-11-09 08:17:24.738005
69634e01-09c3-4636-850b-605df9a8ac58	quotation	quotation.subtotal	Subtotal	currency	totals	2025-11-09 08:17:24.738005
133ea3b2-053a-41b9-b0cc-62f361a84df9	quotation	quotation.taxAmount	Tax Amount	currency	totals	2025-11-09 08:17:24.738005
e4776deb-4668-46cb-9d28-43afc7fbbbc9	quotation	quotation.totalAmount	Total Amount	currency	totals	2025-11-09 08:17:24.738005
8ed659ad-5099-43ca-bab4-3735287a071f	quotation	quotation.revisionNumber	Revision	text	quotation	2025-11-09 08:17:24.738005
84c4d4bd-d918-4f29-a742-6f656a8cbfe7	quotation	quotation.status	Status	text	quotation	2025-11-09 08:17:24.738005
1b42a831-c5f0-4dc9-9e35-8b7beb67777f	quotation	customer.name	Customer Name	text	customer	2025-11-09 08:17:24.738005
81f957b8-3472-49a9-897d-cb6aa829cb5e	quotation	customer.email	Customer Email	text	customer	2025-11-09 08:17:24.738005
2723bc8b-c797-45dd-bfe4-8a03eadef14a	quotation	customer.phone	Customer Phone	text	customer	2025-11-09 08:17:24.738005
47d62d1e-a935-40c9-8bdf-5ea81fac41b0	quotation	customer.customerNumber	Customer Number	text	customer	2025-11-09 08:17:24.738005
1d1ed958-61be-4328-87d6-4176db69af9e	quotation	customer.address.street	Customer Street	text	customer	2025-11-09 08:17:24.738005
29506bd1-e36e-42a9-8f6f-3b0655771e92	quotation	customer.address.city	Customer City	text	customer	2025-11-09 08:17:24.738005
ea129777-97ca-4478-a68b-e40e419a095e	quotation	customer.address.postalCode	Customer Postal Code	text	customer	2025-11-09 08:17:24.738005
449dbbeb-28ef-4162-bc3c-bf4951db87f2	quotation	customer.address.country	Customer Country	text	customer	2025-11-09 08:17:24.738005
47ec6c9f-b715-4aed-ad28-9b39f7c104af	quotation	project.name	Project Name	text	project	2025-11-09 08:17:24.738005
9ebb94d9-2731-4ae7-9d45-2a76b551017b	quotation	project.projectNumber	Project Number	text	project	2025-11-09 08:17:24.738005
7c66fae4-2016-43d2-9f04-8fb714a6f964	quotation	project.description	Project Description	text	project	2025-11-09 08:17:24.738005
08290c07-1d7f-4bef-88ab-475518916dc3	quotation	company.name	Company Name	text	company	2025-11-09 08:17:24.738005
4b85a29e-e0da-43c9-bca6-71d8ba6c3d11	quotation	company.logoUrl	Company Logo	text	company	2025-11-09 08:17:24.738005
75bfd44f-42a2-4ee9-bbbb-1198f13a25e2	quotation	company.phone	Company Phone	text	company	2025-11-09 08:17:24.738005
1a19b0e5-146e-417b-8058-99a12e6b3ecc	quotation	company.email	Company Email	text	company	2025-11-09 08:17:24.738005
4d7afc02-b98f-448b-8b8e-42730750bf7b	quotation	company.website	Company Website	text	company	2025-11-09 08:17:24.738005
3450c4c8-85d1-4365-841a-ed70e63eb849	quotation	company.street	Company Street	text	company	2025-11-09 08:17:24.738005
8a3b7920-f757-491c-b4a9-db80504b42de	quotation	company.city	Company City	text	company	2025-11-09 08:17:24.738005
afa231b0-e9ab-4522-9dc6-92636a348b7c	quotation	company.postalCode	Company Postal Code	text	company	2025-11-09 08:17:24.738005
f6e9bd1d-2d79-4ee3-a85a-b9f8eb0e73b1	quotation	company.country	Company Country	text	company	2025-11-09 08:17:24.738005
53f46f02-eb9e-4d79-8183-832228dea46e	quotation	company.kvkNummer	Company KVK	text	company	2025-11-09 08:17:24.738005
d6f5c48f-9a76-4b8e-8a58-61f680e1d6cd	quotation	company.btwNummer	Company BTW	text	company	2025-11-09 08:17:24.738005
c4506dff-b5a0-437b-b868-7e371c3dcad9	quotation	company.bankAccount	Company Bank Account	text	company	2025-11-09 08:17:24.738005
\.


--
-- Data for Name: document_layouts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.document_layouts (id, document_type, name, page_format, orientation, is_default, metadata, created_at, updated_at, allowed_tables) FROM stdin;
5ce0fd0e-57b3-4a4b-83ea-bd9b9b3e4f4c	quotation	Standard Quotation Layout	a4	portrait	t	{}	2025-10-21 08:39:23.579749	2025-11-09 08:17:06.875377	["quotations", "customers", "projects", "company_profiles"]
\.


--
-- Data for Name: images; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.images (id, name, description, category, image_data, width, height, is_active, created_at) FROM stdin;
cadb1610-b2b0-4ab1-a3f1-569cec1a41ed	Bedrijfslogo	Het officiële bedrijfslogo	logo	data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyNC4zLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHZpZXdCb3g9IjAgMCAxMzA1LjA1IDIxNS45MSIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTMwNS4wNSAyMTUuOTE7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxnPg0KCTxnPg0KCQk8Zz4NCgkJCTxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfMV8iIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iMCIgeTE9Ijc3LjM0NjUiIHgyPSIxNTQuNjkzMSIgeTI9Ijc3LjM0NjUiPg0KCQkJCTxzdG9wICBvZmZzZXQ9IjUuMzc2MzQ1ZS0wMyIgc3R5bGU9InN0b3AtY29sb3I6I0ZGNkEwMCIvPg0KCQkJCTxzdG9wICBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiNGN0JDMUUiLz4NCgkJCTwvbGluZWFyR3JhZGllbnQ+DQoJCQk8cmVjdCBzdHlsZT0iZmlsbDp1cmwoI1NWR0lEXzFfKTsiIHdpZHRoPSIxNTQuNjkiIGhlaWdodD0iMTU0LjY5Ii8+DQoJCTwvZz4NCgkJPGc+DQoJCQk8cGF0aCBkPSJNMjY4LjQ3LDQwLjEybDMyLjg1LDczLjczaC0xNS45NmwtNS45NC0xMy4zNWgtMjcuODRjLTAuOSwyLjA5LTEuOSw0LjMzLTIuOTcsNi43M2MtMS4wOCwyLjQtMi4wMyw0LjYxLTIuODcsNi42Mg0KCQkJCWgtMTUuODVsMzIuNDMtNzMuNzNIMjY4LjQ3eiBNMjcyLjk2LDg2bC03LjUxLTE2Ljg5TDI1Ny45NCw4NkgyNzIuOTZ6Ii8+DQoJCQk8cGF0aCBkPSJNMzU3LjMyLDU1LjM0SDMzNy4zdjU4LjVoLTE0LjV2LTU4LjVoLTIwLjIzdi0xNC41aDU0Ljc1VjU1LjM0eiIvPg0KCQkJPHBhdGggZD0iTTM4Ny45OCw1NS4zNHYxNC43aDIzLjY3djE0LjZoLTIzLjY3djE0LjdoMzIuNDN2MTQuNWgtNDYuOTN2LTczaDQ2LjkzdjE0LjVIMzg3Ljk4eiIvPg0KCQkJPHBhdGggZD0iTTQ4MS44NCwxMTQuNThjLTMuMiwwLTYuMjktMC40NS05LjI4LTEuMzZjLTIuOTktMC45LTUuODEtMi4xOS04LjQ1LTMuODZoMC4xYy0xLjg4LTEuMTgtMy41NS0yLjQ3LTUuMDEtMy44Ng0KCQkJCWMtMS40Ni0xLjM5LTIuNDctMi40LTMuMDItMy4wMmwxMC44NS0xMC4wMWMwLjQ5LDAuNjIsMS4yNywxLjM3LDIuMzUsMi4yNGMxLjA4LDAuODcsMi4zMSwxLjcxLDMuNywyLjUNCgkJCQljMS4zOSwwLjgsMi44NSwxLjQ4LDQuMzgsMi4wM2MxLjUzLDAuNTYsMi45OSwwLjgzLDQuMzgsMC44M2MxLjE4LDAsMi4zNi0wLjE0LDMuNTUtMC40MmMxLjE4LTAuMjgsMi4yNi0wLjcxLDMuMjMtMS4zDQoJCQkJYzAuOTctMC41OSwxLjc3LTEuMzcsMi40LTIuMzVjMC42My0wLjk3LDAuOTQtMi4xOSwwLjk0LTMuNjVjMC0wLjU2LTAuMTktMS4xNi0wLjU3LTEuODNjLTAuMzgtMC42Ni0xLjA0LTEuMzctMS45OC0yLjE0DQoJCQkJYy0wLjk0LTAuNzYtMi4yNC0xLjU4LTMuOTEtMi40NWMtMS42Ny0wLjg3LTMuNzUtMS43OS02LjI2LTIuNzZjLTIuOTItMS4xMS01LjYzLTIuMzEtOC4xMy0zLjZjLTIuNS0xLjI5LTQuNjgtMi44LTYuNTItNC41NA0KCQkJCWMtMS44NC0xLjc0LTMuMjctMy43Mi00LjI4LTUuOTRjLTEuMDEtMi4yMi0xLjUxLTQuOC0xLjUxLTcuNzJjMC0yLjk5LDAuNTYtNS43OSwxLjY3LTguMzljMS4xMS0yLjYxLDIuNjktNC44Nyw0Ljc1LTYuNzgNCgkJCQljMi4wNS0xLjkxLDQuNTItMy40MSw3LjQtNC40OGMyLjg4LTEuMDgsNi4wNi0xLjYyLDkuNTQtMS42MmMxLjg4LDAsMy44NywwLjI1LDYsMC43M2MyLjEyLDAuNDksNC4xOSwxLjExLDYuMjEsMS44OA0KCQkJCWMyLjAyLDAuNzcsMy45MSwxLjY1LDUuNjgsMi42NmMxLjc3LDEuMDEsMy4yNSwyLjAzLDQuNDMsMy4wOGwtOC45NywxMS4yNmMtMS4zMi0wLjktMi42OC0xLjc0LTQuMDctMi41DQoJCQkJYy0xLjE4LTAuNjItMi41NC0xLjIxLTQuMDctMS43N2MtMS41My0wLjU2LTMuMDktMC44My00LjY5LTAuODNjLTIuOTIsMC01LjIsMC41Ny02LjgzLDEuNzJjLTEuNjMsMS4xNS0yLjQ1LDIuOC0yLjQ1LDQuOTUNCgkJCQljMCwwLjk3LDAuMjksMS44NiwwLjg5LDIuNjZjMC41OSwwLjgsMS4zOSwxLjUzLDIuNCwyLjE5YzEuMDEsMC42NiwyLjE3LDEuMjcsMy40OSwxLjgzYzEuMzIsMC41NiwyLjcxLDEuMDgsNC4xNywxLjU2DQoJCQkJYzQuMTcsMS42LDcuNjgsMy4yMiwxMC41Myw0Ljg1YzIuODUsMS42Myw1LjE0LDMuMzcsNi44OCw1LjIxYzEuNzQsMS44NCwyLjk3LDMuODIsMy43LDUuOTRjMC43MywyLjEyLDEuMDksNC40MywxLjA5LDYuOTQNCgkJCQljMCwzLjA2LTAuNjMsNS45NC0xLjg4LDguNjZjLTEuMjUsMi43MS0yLjk3LDUuMDYtNS4xNiw3LjA0cy00LjgsMy41NS03LjgyLDQuNjlDNDg4LjY3LDExNCw0ODUuMzgsMTE0LjU4LDQ4MS44NCwxMTQuNTh6Ii8+DQoJCQk8cGF0aCBkPSJNNTU1LjY3LDExNC41OGMtNC41OSwwLTkuMDctMC44Ny0xMy40NS0yLjYxYy00LjM4LTEuNzQtOC4yOS00LjE5LTExLjczLTcuMzVjLTMuNDQtMy4xNi02LjIxLTYuOTktOC4yOS0xMS40Nw0KCQkJCWMtMi4wOS00LjQ4LTMuMTMtOS41MS0zLjEzLTE1LjA3YzAtNC44LDAuOTItOS40MiwyLjc2LTEzLjg3YzEuODQtNC40NSw0LjQtOC4zNiw3LjY3LTExLjczYzMuMjctMy4zNyw3LjEzLTYuMDcsMTEuNTgtOC4wOA0KCQkJCWM0LjQ1LTIuMDIsOS4zMi0zLjAyLDE0LjYtMy4wMmM0LjY2LDAsOS4xOSwwLjksMTMuNjEsMi43MWM0LjQxLDEuODEsOC4zMSw0LjM1LDExLjY4LDcuNjFjMy4zNywzLjI3LDYuMDgsNy4xNCw4LjEzLDExLjYzDQoJCQkJYzIuMDUsNC40OCwzLjA4LDkuNCwzLjA4LDE0Ljc2YzAsNC43My0wLjksOS4yOC0yLjcxLDEzLjY2Yy0xLjgxLDQuMzgtNC4zMyw4LjI3LTcuNTYsMTEuNjhjLTMuMjMsMy40MS03LjA5LDYuMTItMTEuNTgsOC4xMw0KCQkJCUM1NjUuODQsMTEzLjU3LDU2MC45NSwxMTQuNTgsNTU1LjY3LDExNC41OHogTTU1NS42Nyw1NS42NmMtMy4xMywwLTYuMDUsMC41OS04Ljc2LDEuNzdjLTIuNzEsMS4xOC01LjA4LDIuOC03LjA5LDQuODUNCgkJCQljLTIuMDIsMi4wNS0zLjYyLDQuNDMtNC44LDcuMTRjLTEuMTgsMi43MS0xLjc3LDUuNi0xLjc3LDguNjZjMCwzLjA2LDAuNTksNS45NCwxLjc3LDguNjZjMS4xOCwyLjcxLDIuNzgsNS4wOCw0LjgsNy4wOQ0KCQkJCWMyLjAyLDIuMDIsNC40LDMuNiw3LjE0LDQuNzVjMi43NSwxLjE1LDUuNjUsMS43Miw4LjcxLDEuNzJjMy4wNiwwLDUuOTMtMC41OSw4LjYtMS43N2MyLjY4LTEuMTgsNS4wMi0yLjc4LDcuMDQtNC44DQoJCQkJYzIuMDItMi4wMiwzLjYxLTQuMzYsNC44LTcuMDRjMS4xOC0yLjY4LDEuNzctNS41NCwxLjc3LTguNmMwLTMuMDYtMC41OS01Ljk0LTEuNzctOC42NmMtMS4xOC0yLjcxLTIuOC01LjA5LTQuODUtNy4xNA0KCQkJCWMtMi4wNS0yLjA1LTQuNDItMy42Ny03LjA5LTQuODVDNTYxLjQ5LDU2LjI1LDU1OC42Niw1NS42Niw1NTUuNjcsNTUuNjZ6Ii8+DQoJCQk8cGF0aCBkPSJNNjU0LjQzLDExMy44NWgtNDMuOXYtNzNoMTQuNXY1OC41aDI5LjQxVjExMy44NXoiLz4NCgkJCTxwYXRoIGQ9Ik02OTcuNzEsMTE0LjU4Yy00LjE3LDAtOC0wLjcxLTExLjQ3LTIuMTRjLTMuNDgtMS40Mi02LjQ1LTMuMzktOC45Mi01Ljg5Yy0yLjQ3LTIuNS00LjQtNS40OS01Ljc5LTguOTcNCgkJCQljLTEuMzktMy40OC0yLjA5LTcuMy0yLjA5LTExLjQ3VjQwLjg1aDE0LjM5djQzLjM4YzAsMi40MywwLjM4LDQuNjQsMS4xNSw2LjYyYzAuNzYsMS45OCwxLjc5LDMuNjUsMy4wOCw1LjAxDQoJCQkJYzEuMjksMS4zNiwyLjc2LDIuNCw0LjQzLDMuMTNjMS42NywwLjczLDMuNDEsMS4wOSw1LjIxLDEuMDljMS44MSwwLDMuNTUtMC4zNyw1LjIxLTEuMDljMS42Ny0wLjczLDMuMTQtMS43Nyw0LjQzLTMuMTMNCgkJCQljMS4yOS0xLjM2LDIuMzEtMy4wMiwzLjA4LTUuMDFjMC43Ni0xLjk4LDEuMTUtNC4xOSwxLjE1LTYuNjJWNDAuODVoMTQuNXY0NS4yNmMwLDQuMTctMC43LDgtMi4wOSwxMS40Nw0KCQkJCWMtMS4zOSwzLjQ4LTMuMzQsNi40Ny01Ljg0LDguOTdjLTIuNSwyLjUtNS40OSw0LjQ3LTguOTcsNS44OUM3MDUuNywxMTMuODYsNzAxLjg4LDExNC41OCw2OTcuNzEsMTE0LjU4eiIvPg0KCQkJPHBhdGggZD0iTTc5Ni4yNiw1NS4zNGgtMjAuMDJ2NTguNWgtMTQuNXYtNTguNWgtMjAuMjN2LTE0LjVoNTQuNzVWNTUuMzR6Ii8+DQoJCQk8cGF0aCBkPSJNODEyLjExLDExMy44NXYtNzNoMTQuMzl2NzNIODEyLjExeiIvPg0KCQkJPHBhdGggZD0iTTg3OS4yNiwxMTQuNThjLTQuNTksMC05LjA3LTAuODctMTMuNDUtMi42MWMtNC4zOC0xLjc0LTguMjktNC4xOS0xMS43My03LjM1Yy0zLjQ0LTMuMTYtNi4yMS02Ljk5LTguMjktMTEuNDcNCgkJCQljLTIuMDktNC40OC0zLjEzLTkuNTEtMy4xMy0xNS4wN2MwLTQuOCwwLjkyLTkuNDIsMi43Ni0xMy44N2MxLjg0LTQuNDUsNC40LTguMzYsNy42Ny0xMS43M2MzLjI3LTMuMzcsNy4xMy02LjA3LDExLjU4LTguMDgNCgkJCQljNC40NS0yLjAyLDkuMzItMy4wMiwxNC42LTMuMDJjNC42NiwwLDkuMTksMC45LDEzLjYxLDIuNzFjNC40MSwxLjgxLDguMzEsNC4zNSwxMS42OCw3LjYxYzMuMzcsMy4yNyw2LjA4LDcuMTQsOC4xMywxMS42Mw0KCQkJCWMyLjA1LDQuNDgsMy4wOCw5LjQsMy4wOCwxNC43NmMwLDQuNzMtMC45LDkuMjgtMi43MSwxMy42NmMtMS44MSw0LjM4LTQuMzMsOC4yNy03LjU2LDExLjY4Yy0zLjIzLDMuNDEtNy4wOSw2LjEyLTExLjU4LDguMTMNCgkJCQlDODg5LjQzLDExMy41Nyw4ODQuNTUsMTE0LjU4LDg3OS4yNiwxMTQuNTh6IE04NzkuMjYsNTUuNjZjLTMuMTMsMC02LjA1LDAuNTktOC43NiwxLjc3Yy0yLjcxLDEuMTgtNS4wOCwyLjgtNy4wOSw0Ljg1DQoJCQkJYy0yLjAyLDIuMDUtMy42Miw0LjQzLTQuOCw3LjE0Yy0xLjE4LDIuNzEtMS43Nyw1LjYtMS43Nyw4LjY2YzAsMy4wNiwwLjU5LDUuOTQsMS43Nyw4LjY2YzEuMTgsMi43MSwyLjc4LDUuMDgsNC44LDcuMDkNCgkJCQljMi4wMiwyLjAyLDQuNCwzLjYsNy4xNCw0Ljc1YzIuNzUsMS4xNSw1LjY1LDEuNzIsOC43MSwxLjcyYzMuMDYsMCw1LjkzLTAuNTksOC42LTEuNzdjMi42OC0xLjE4LDUuMDItMi43OCw3LjA0LTQuOA0KCQkJCWMyLjAyLTIuMDIsMy42MS00LjM2LDQuOC03LjA0YzEuMTgtMi42OCwxLjc3LTUuNTQsMS43Ny04LjZjMC0zLjA2LTAuNTktNS45NC0xLjc3LTguNjZjLTEuMTgtMi43MS0yLjgtNS4wOS00Ljg1LTcuMTQNCgkJCQljLTIuMDUtMi4wNS00LjQyLTMuNjctNy4wOS00Ljg1Qzg4NS4wOSw1Ni4yNSw4ODIuMjUsNTUuNjYsODc5LjI2LDU1LjY2eiIvPg0KCQkJPHBhdGggZD0iTTkzNC4zMyw0MC4xMmg2LjM2bDM5LjQyLDQzLjhWNDAuODVoMTQuMzl2NzMuNzNoLTYuNDdsLTM5LjMyLTQzLjd2NDIuOTZoLTE0LjM5VjQwLjEyeiIvPg0KCQkJPHBhdGggZD0iTTEwMzUuNTksMTE0LjU4Yy0zLjIsMC02LjI5LTAuNDUtOS4yOC0xLjM2Yy0yLjk5LTAuOS01LjgxLTIuMTktOC40NS0zLjg2aDAuMWMtMS44OC0xLjE4LTMuNTUtMi40Ny01LjAxLTMuODYNCgkJCQljLTEuNDYtMS4zOS0yLjQ3LTIuNC0zLjAyLTMuMDJsMTAuODUtMTAuMDFjMC40OSwwLjYyLDEuMjcsMS4zNywyLjM1LDIuMjRjMS4wOCwwLjg3LDIuMzEsMS43MSwzLjcsMi41DQoJCQkJYzEuMzksMC44LDIuODUsMS40OCw0LjM4LDIuMDNjMS41MywwLjU2LDIuOTksMC44Myw0LjM4LDAuODNjMS4xOCwwLDIuMzYtMC4xNCwzLjU1LTAuNDJjMS4xOC0wLjI4LDIuMjYtMC43MSwzLjIzLTEuMw0KCQkJCWMwLjk3LTAuNTksMS43Ny0xLjM3LDIuNC0yLjM1YzAuNjMtMC45NywwLjk0LTIuMTksMC45NC0zLjY1YzAtMC41Ni0wLjE5LTEuMTYtMC41Ny0xLjgzYy0wLjM4LTAuNjYtMS4wNC0xLjM3LTEuOTgtMi4xNA0KCQkJCWMtMC45NC0wLjc2LTIuMjQtMS41OC0zLjkxLTIuNDVjLTEuNjctMC44Ny0zLjc1LTEuNzktNi4yNi0yLjc2Yy0yLjkyLTEuMTEtNS42My0yLjMxLTguMTMtMy42Yy0yLjUtMS4yOS00LjY4LTIuOC02LjUyLTQuNTQNCgkJCQljLTEuODQtMS43NC0zLjI3LTMuNzItNC4yOC01Ljk0Yy0xLjAxLTIuMjItMS41MS00LjgtMS41MS03LjcyYzAtMi45OSwwLjU2LTUuNzksMS42Ny04LjM5YzEuMTEtMi42MSwyLjY5LTQuODcsNC43NS02Ljc4DQoJCQkJYzIuMDUtMS45MSw0LjUyLTMuNDEsNy40LTQuNDhjMi44OC0xLjA4LDYuMDYtMS42Miw5LjU0LTEuNjJjMS44OCwwLDMuODcsMC4yNSw2LDAuNzNjMi4xMiwwLjQ5LDQuMTksMS4xMSw2LjIxLDEuODgNCgkJCQljMi4wMiwwLjc3LDMuOTEsMS42NSw1LjY4LDIuNjZjMS43NywxLjAxLDMuMjUsMi4wMyw0LjQzLDMuMDhsLTguOTcsMTEuMjZjLTEuMzItMC45LTIuNjgtMS43NC00LjA3LTIuNQ0KCQkJCWMtMS4xOC0wLjYyLTIuNTQtMS4yMS00LjA3LTEuNzdjLTEuNTMtMC41Ni0zLjA5LTAuODMtNC42OS0wLjgzYy0yLjkyLDAtNS4yLDAuNTctNi44MywxLjcyYy0xLjYzLDEuMTUtMi40NSwyLjgtMi40NSw0Ljk1DQoJCQkJYzAsMC45NywwLjI5LDEuODYsMC44OSwyLjY2YzAuNTksMC44LDEuMzksMS41MywyLjQsMi4xOWMxLjAxLDAuNjYsMi4xNywxLjI3LDMuNDksMS44M2MxLjMyLDAuNTYsMi43MSwxLjA4LDQuMTcsMS41Ng0KCQkJCWM0LjE3LDEuNiw3LjY4LDMuMjIsMTAuNTMsNC44NWMyLjg1LDEuNjMsNS4xNCwzLjM3LDYuODgsNS4yMWMxLjc0LDEuODQsMi45NywzLjgyLDMuNyw1Ljk0YzAuNzMsMi4xMiwxLjA5LDQuNDMsMS4wOSw2Ljk0DQoJCQkJYzAsMy4wNi0wLjYzLDUuOTQtMS44OCw4LjY2Yy0xLjI1LDIuNzEtMi45Nyw1LjA2LTUuMTYsNy4wNHMtNC44LDMuNTUtNy44Miw0LjY5QzEwNDIuNDIsMTE0LDEwMzkuMTMsMTE0LjU4LDEwMzUuNTksMTE0LjU4eiIvPg0KCQkJPHBhdGggZD0iTTExNTMuOTUsNjAuODdjMCwyLjM2LTAuNTQsNC45Mi0xLjYxLDcuNjdjLTEuMDcsMi43NS0zLjA5LDUuMTYtNi4wNiw3LjI1YzEuOCwwLjgzLDMuMzUsMS44OCw0LjY3LDMuMTMNCgkJCQljMS4zMSwxLjI1LDIuMzksMi41OSwzLjIyLDQuMDJjMC44MywxLjQyLDEuNDUsMi45LDEuODcsNC40M2MwLjQxLDEuNTMsMC42MiwzLjAyLDAuNjIsNC40OGMwLDIuNzEtMC40LDUuMzctMS4yLDcuOTgNCgkJCQljLTAuOCwyLjYxLTIuMTUsNC45NS00LjA2LDcuMDRzLTQuNDQsMy43Ny03LjYsNS4wNmMtMy4xNiwxLjI5LTcuMDksMS45My0xMS44MSwxLjkzaC0yOS41NnYtNzNoMjkuMjUNCgkJCQljMy4xMiwwLDYuMDQsMC41Niw4Ljc0LDEuNjdjMi43MSwxLjExLDUuMDYsMi41OSw3LjA4LDQuNDNjMi4wMSwxLjg0LDMuNTksMy45OCw0Ljc0LDYuNDENCgkJCQlDMTE1My4zNyw1NS44LDExNTMuOTUsNTguMywxMTUzLjk1LDYwLjg3eiBNMTExNi45Myw2OS4zMmgxMy4xNGMyLjU3LDAsNC42NC0wLjYxLDYuMi0xLjgzYzEuNTYtMS4yMiwyLjM1LTIuODMsMi4zNS00Ljg1DQoJCQkJYzAtMi4wMi0wLjc4LTMuNzQtMi4zNS01LjE2Yy0xLjU2LTEuNDItMy42My0yLjE0LTYuMi0yLjE0aC0xMy4xNFY2OS4zMnogTTExMzAuMTcsOTkuMzVjMy45NiwwLDYuODEtMC43NSw4LjU1LTIuMjQNCgkJCQljMS43NC0xLjQ5LDIuNjEtMy4yNSwyLjYxLTUuMjdjMC0xLjA0LTAuMTctMi4wNS0wLjUyLTMuMDJjLTAuMzUtMC45Ny0wLjk0LTEuODMtMS43Ny0yLjU1Yy0wLjgzLTAuNzMtMS45OC0xLjMyLTMuNDQtMS43Nw0KCQkJCWMtMS40Ni0wLjQ1LTMuMjctMC42OC01LjQyLTAuNjhoLTEzLjI0djE1LjU0SDExMzAuMTd6Ii8+DQoJCQk8cGF0aCBkPSJNMTE5MS4wNywxMDUuNzFjMCwyLjQzLTAuODUsNC41Mi0yLjU1LDYuMjZjLTEuNywxLjc0LTMuODQsMi42MS02LjQxLDIuNjFjLTEuMjUsMC0yLjQyLTAuMjUtMy40OS0wLjczDQoJCQkJYy0xLjA4LTAuNDktMi4wMi0xLjEzLTIuODItMS45M2MtMC44LTAuOC0xLjQzLTEuNzQtMS44OC0yLjgyYy0wLjQ1LTEuMDgtMC42OC0yLjIxLTAuNjgtMy4zOWMwLTIuNSwwLjg3LTQuNjIsMi42MS02LjM2DQoJCQkJYzEuNzQtMS43NCwzLjgyLTIuNjEsNi4yNi0yLjYxYzIuNTcsMCw0LjcxLDAuODcsNi40MSwyLjYxQzExOTAuMjIsMTAxLjA5LDExOTEuMDcsMTAzLjIxLDExOTEuMDcsMTA1LjcxeiIvPg0KCQkJPHBhdGggZD0iTTEyMzUuOTEsMTE0LjU4bC0zMi44NS03My43M2gxNS44NWwxOS45Miw0NC42M2MzLjI3LTcuNDQsNi41NS0xNC44OSw5Ljg1LTIyLjM3YzMuMy03LjQ3LDYuNjItMTQuODksOS45Ni0yMi4yNmgxNS44NQ0KCQkJCWwtMzIuNTQsNzMuNzNIMTIzNS45MXoiLz4NCgkJCTxwYXRoIGQ9Ik0xMzA1LjA1LDEwNS43MWMwLDIuNDMtMC44NSw0LjUyLTIuNTUsNi4yNmMtMS43LDEuNzQtMy44NCwyLjYxLTYuNDEsMi42MWMtMS4yNSwwLTIuNDItMC4yNS0zLjQ5LTAuNzMNCgkJCQljLTEuMDgtMC40OS0yLjAyLTEuMTMtMi44Mi0xLjkzYy0wLjgtMC44LTEuNDMtMS43NC0xLjg4LTIuODJjLTAuNDUtMS4wOC0wLjY4LTIuMjEtMC42OC0zLjM5YzAtMi41LDAuODctNC42MiwyLjYxLTYuMzYNCgkJCQljMS43NC0xLjc0LDMuODItMi42MSw2LjI2LTIuNjFjMi41NywwLDQuNzEsMC44Nyw2LjQxLDIuNjFDMTMwNC4yLDEwMS4wOSwxMzA1LjA1LDEwMy4yMSwxMzA1LjA1LDEwNS43MXoiLz4NCgkJPC9nPg0KCTwvZz4NCgk8cmVjdCB5PSIyMDUuMjIiIHN0eWxlPSJmaWxsOiNBOEE5QUM7IiB3aWR0aD0iMTMwNS4wNSIgaGVpZ2h0PSIxMC42OSIvPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPC9zdmc+DQo=	200	100	t	2025-11-10 20:26:15.69477
51e6183d-3b69-4c0b-8005-2584b9517246	Logo for document top		general	data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAqACoAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAEAAAAAAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCADsCOsDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA8B/al/bu0n9ljxXp+k6jo+oapNqFsbtHt3UKi72XBz/ALteZp/wWI8NuvHhPWv+/wBHXmP/AAWDjCfGjw3/ANghuvP/AC2evk1DxX8o8eeKmf5ZnlfA4SolCDSS5U+ie7Xmf1fwB4S8P5rw/QzDGU26k023zNLdrZM/QYf8FgPDR/5lTWv+/wBH/jUy/wDBXTw63/Mp61/3+Svz+gGatwRr/d/SvjH43cUr/l7H/wABj/kfVy8EeFl/y7l/4FL/ADPvpP8AgrX4df8A5lfWv+/iVIv/AAVh8PN/zLGsf9/Er4MgGXq3EuD+NZ/8Rw4q/wCfsf8AwGP+Rx1PBfhiL/hy/wDApf5n3cn/AAVZ8PuR/wAUxrA/7aJUq/8ABVHw+3/Mt6t/39jr4VhGKtxNyOn5VD8ceK/+fsf/AAGP+Rx1PB3hpbU5f+BP/M+4l/4KkaDIePDerf8Af1P8akT/AIKf6G//ADLmqf8Af1K+JYhhKtQis345cVr/AJex/wDAY/5HFPwk4dW1N/8AgT/zPtZP+Cmmiv8A8y5qn/fxP8akT/gpborH/kXdU/7+JXxjBU6cgf4Vm/HXiy38WP8A4DH/ACOKp4VZAtoP/wACl/mfZsf/AAUh0V/+Ze1X/v4n+NSL/wAFGdDb/mX9TH1kSvjuAYFWoxlqz/4jtxZ/z9j/AOAx/wAjkn4Y5CtoS/8AApH16v8AwUQ0d/8AmBaj/wB/EqVP+Cg+jyf8wPUf+/i18lQjmrMFZ/8AEeOLf+f0f/AInHU8N8jW0H/4E/8AM+sl/b+0hv8AmB6j/wB9rUi/t66S/wDzA9S/7+JXyrByKtQ9BR/xHji7/n9H/wAAiccvD7JltB/+BP8AzPqRP26tJcr/AMSfUPmOM704+te5WNz9rtI5f+eihvpmvzztUzKvXqBwfev0J0j/AJBVv/1yX8eK/ePBHj7N+JJYpZpNS9nyctklvzX2XkfnHG2QYPLPZfVU1zXvd32sW6KKK/oA+BCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPzp/4LCf8AJZ/Df/YIb/0c1fJadK+tP+Cwn/JZ/Df/AGCG/wDRzV8lp0r+B/FX/kqMX6r8kf334R/8kjhPR/8ApTLcP3auQ/dqnD92rkP3a/OZH3dQt2/36txf1qpb/fq3F/Wspbnm1izF2qzF95arRdqsxfeWokefV3Lsf3BVqCqsf3BVqCsZnm1ty5BViPoKrwVYj6CspbHm1di7D92rMX36rQ/dqzF9+sZbnn1di9D1qxBVeHrViCs5bnl1Ni5b9KtxfdWqlv0q3F91aiR51Qt2n+tX6j+dfoPov/ILtv8Arkv8hX58Wn+tX6j+dfoPon/ILtv+uS/yFf1T9GP4sd6Q/OR+OeJn/Lj/ALe/Qt0UUV/Wp+ThRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFF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s4ZHJy0KaldBBn0UfKPZQO1AH31nNFIowtI0qrnJAx1zQA6ik3ClVsigAooooA4j9oT4HaH+0v8AA/xZ8P8AxNb/AGjQfF+lT6VeptBKxyoV3rkY3oSGU9ioNfxCftb/ALN+vfsg/tLeNvhn4mhaHWfBmrT6ZOeomVH+SRT3V02up7hhX92ROBX88X/B5x+wA3h3x14L/aM0KyC2viJV8LeKHReFu4kZ7Kdu+XhSSLPQeRGOrUAfjh+x7+03rf7HX7T/AIH+J3h2Ty9U8G6tBqCqD8s6K/7yJhnlXQspHTmvoz/gvV/wUyh/4Kg/tzXfizQ5br/hBdA06DSvDdvMu1o4tokmcqQCGaZnz1+6K+JChFCfeoAlto2kmRVVizHChepPt71/ZF/wQN/YHT/gnr/wTb8E+F761+z+LvEsI8T+JNybZFvLpFYQsDyPJhEURHTekhH3q/nS/wCDcX9gEft7/wDBTTwpb6rZi68F/DnHi7xAHTdFOlu6/Z7c9j5twYwVPWNZfSv6+4kIkJ7/AOf8/hQBNRRRQAUU13CLk9PWhZA44NADqKaWAP60qtmgBaKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPzp/4LCf8AJZ/Df/YIb/0c1fJadK+tP+Cwn/JZ/Df/AGCG/wDRzV8lp0r+B/FX/kqMX6r8kf334R/8kjhPR/8ApTLcP3auQ/dqnD92rkP3a/OZH3dQt2/36txf1qpb/fq3F/Wspbnm1izF2qzF95arRdqsxfeWokefV3Lsf3BVqCqsf3BVqCsZnm1ty5BViPoKrwVYj6CspbHm1di7D92rMX36rQ/dqzF9+sZbnn1di9D1qxBVeHrViCs5bnl1Ni5b9KtxfdWqlv0q3F91aiR51Qt2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UUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAB1ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAryf9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AOVrUP8A4/XpHwP/AGbvBH7N+lX1n4L0C30WHUpVmumEss8s7KMKGklZnKqM4XO1SzEAFmJAO4ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9k=	\N	\N	t	2025-12-07 20:07:43.8371
\.


--
-- Data for Name: incoterms; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.incoterms (id, code, name, description, category, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: inventory_components; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_components (id, parent_item_id, component_item_id, quantity, created_at) FROM stdin;
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_items (id, name, sku, description, category, unit, unit_price, current_stock, minimum_stock, status, created_at, cost_price, margin, image, is_composite) FROM stdin;
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invoice_items (id, invoice_id, item_id, description, quantity, unit_price, line_total, line_type, "position", source_snippet_id, source_snippet_version) FROM stdin;
36582b0f-612f-4620-98a7-c667e017c4a2	52676213-2666-46ab-8d3e-0ef4d4c23153	\N	Standard Product Item	2	25.00	50.00	standard	0	\N	\N
f3700d21-d2d5-4237-a702-ac319eab4159	52676213-2666-46ab-8d3e-0ef4d4c23153	\N	Custom Engineered Component	1	150.00	150.00	unique	0	\N	\N
99ef9406-91e4-4942-a0eb-c987b078cada	52676213-2666-46ab-8d3e-0ef4d4c23153	\N	--- Project Header Text ---	0	0.00	0.00	text	0	\N	\N
166bc0f6-ca34-4e0a-b045-4c9baad294fe	52676213-2666-46ab-8d3e-0ef4d4c23153	\N	Shipping and Handling Fee	1	15.00	15.00	charges	0	\N	\N
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invoices (id, invoice_number, customer_id, quotation_id, project_id, status, due_date, subtotal, tax_amount, total_amount, paid_amount, notes, created_at) FROM stdin;
52676213-2666-46ab-8d3e-0ef4d4c23153	CI-2025-001	1698a4d0-7d34-4685-b256-1d0cf6e5200b	\N	\N	pending	2025-10-16 14:20:11.203	100.00	0.00	121.00	0.00	\N	2025-09-16 14:20:11.218727
\.


--
-- Data for Name: languages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.languages (id, code, name, created_at) FROM stdin;
924925f3-ad47-4889-8c45-1bd3f1f2f546	nl	Nederlands	2025-09-25 12:41:09.614137
f539a962-74a5-4c72-9efc-50ec3656a833	en	English	2025-09-25 12:41:09.614137
af91c909-949a-47ec-8438-6e8595603a2c	de	Deutsch	2025-09-25 12:41:09.614137
9213d9b0-4e33-4f36-9953-7964c0769706	fr	Français	2025-09-25 12:41:09.614137
1a761599-e0f9-4ec9-9b04-41ae8918c9e6	es	Español	2025-09-25 12:41:09.614137
e29039c4-d04d-4a11-bfda-1f399bba6bc9	it	Italiano	2025-09-25 12:41:09.614137
\.


--
-- Data for Name: layout_blocks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.layout_blocks (id, block_type, label, default_config, compatible_document_types, created_at) FROM stdin;
\.


--
-- Data for Name: layout_elements; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.layout_elements (id, section_id, element_type, field_key, block_id, x_position, y_position, width, height, style, created_at) FROM stdin;
\.


--
-- Data for Name: layout_sections; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.layout_sections (id, layout_id, section_type, "position", allow_multiple, config, created_at, name) FROM stdin;
451fbf3e-2b75-4292-8fa7-8aee3c232ca4	5ce0fd0e-57b3-4a4b-83ea-bd9b9b3e4f4c	header	0	f	{"style": {"padding": {"top": 10, "left": 10, "right": 10, "bottom": 10}, "backgroundColor": "#ffffff"}, "blocks": [{"id": "block-1765135356518", "size": {"width": 190, "height": 20}, "type": "Image", "style": {"fontSize": 9, "fontStyle": "normal", "fontFamily": "helvetica"}, "config": {"alt": "Logo for document top", "fit": "contain", "src": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAqACoAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAEAAAAAAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCADsCOsDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA8B/al/bu0n9ljxXp+k6jo+oapNqFsbtHt3UKi72XBz/ALteZp/wWI8NuvHhPWv+/wBHXmP/AAWDjCfGjw3/ANghuvP/AC2evk1DxX8o8eeKmf5ZnlfA4SolCDSS5U+ie7Xmf1fwB4S8P5rw/QzDGU26k023zNLdrZM/QYf8FgPDR/5lTWv+/wBH/jUy/wDBXTw63/Mp61/3+Svz+gGatwRr/d/SvjH43cUr/l7H/wABj/kfVy8EeFl/y7l/4FL/ADPvpP8AgrX4df8A5lfWv+/iVIv/AAVh8PN/zLGsf9/Er4MgGXq3EuD+NZ/8Rw4q/wCfsf8AwGP+Rx1PBfhiL/hy/wDApf5n3cn/AAVZ8PuR/wAUxrA/7aJUq/8ABVHw+3/Mt6t/39jr4VhGKtxNyOn5VD8ceK/+fsf/AAGP+Rx1PB3hpbU5f+BP/M+4l/4KkaDIePDerf8Af1P8akT/AIKf6G//ADLmqf8Af1K+JYhhKtQis345cVr/AJex/wDAY/5HFPwk4dW1N/8AgT/zPtZP+Cmmiv8A8y5qn/fxP8akT/gpborH/kXdU/7+JXxjBU6cgf4Vm/HXiy38WP8A4DH/ACOKp4VZAtoP/wACl/mfZsf/AAUh0V/+Ze1X/v4n+NSL/wAFGdDb/mX9TH1kSvjuAYFWoxlqz/4jtxZ/z9j/AOAx/wAjkn4Y5CtoS/8AApH16v8AwUQ0d/8AmBaj/wB/EqVP+Cg+jyf8wPUf+/i18lQjmrMFZ/8AEeOLf+f0f/AInHU8N8jW0H/4E/8AM+sl/b+0hv8AmB6j/wB9rUi/t66S/wDzA9S/7+JXyrByKtQ9BR/xHji7/n9H/wAAiccvD7JltB/+BP8AzPqRP26tJcr/AMSfUPmOM704+te5WNz9rtI5f+eihvpmvzztUzKvXqBwfev0J0j/AJBVv/1yX8eK/ePBHj7N+JJYpZpNS9nyctklvzX2XkfnHG2QYPLPZfVU1zXvd32sW6KKK/oA+BCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPzp/4LCf8AJZ/Df/YIb/0c1fJadK+tP+Cwn/JZ/Df/AGCG/wDRzV8lp0r+B/FX/kqMX6r8kf334R/8kjhPR/8ApTLcP3auQ/dqnD92rkP3a/OZH3dQt2/36txf1qpb/fq3F/Wspbnm1izF2qzF95arRdqsxfeWokefV3Lsf3BVqCqsf3BVqCsZnm1ty5BViPoKrwVYj6CspbHm1di7D92rMX36rQ/dqzF9+sZbnn1di9D1qxBVeHrViCs5bnl1Ni5b9KtxfdWqlv0q3F91aiR51Qt2n+tX6j+dfoPov/ILtv8Arkv8hX58Wn+tX6j+dfoPon/ILtv+uS/yFf1T9GP4sd6Q/OR+OeJn/Lj/ALe/Qt0UUV/Wp+ThRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFF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s4ZHJy0KaldBBn0UfKPZQO1AH31nNFIowtI0qrnJAx1zQA6ik3ClVsigAooooA4j9oT4HaH+0v8AA/xZ8P8AxNb/AGjQfF+lT6VeptBKxyoV3rkY3oSGU9ioNfxCftb/ALN+vfsg/tLeNvhn4mhaHWfBmrT6ZOeomVH+SRT3V02up7hhX92ROBX88X/B5x+wA3h3x14L/aM0KyC2viJV8LeKHReFu4kZ7Kdu+XhSSLPQeRGOrUAfjh+x7+03rf7HX7T/AIH+J3h2Ty9U8G6tBqCqD8s6K/7yJhnlXQspHTmvoz/gvV/wUyh/4Kg/tzXfizQ5br/hBdA06DSvDdvMu1o4tokmcqQCGaZnz1+6K+JChFCfeoAlto2kmRVVizHChepPt71/ZF/wQN/YHT/gnr/wTb8E+F761+z+LvEsI8T+JNybZFvLpFYQsDyPJhEURHTekhH3q/nS/wCDcX9gEft7/wDBTTwpb6rZi68F/DnHi7xAHTdFOlu6/Z7c9j5twYwVPWNZfSv6+4kIkJ7/AOf8/hQBNRRRQAUU13CLk9PWhZA44NADqKaWAP60qtmgBaKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPzp/4LCf8AJZ/Df/YIb/0c1fJadK+tP+Cwn/JZ/Df/AGCG/wDRzV8lp0r+B/FX/kqMX6r8kf334R/8kjhPR/8ApTLcP3auQ/dqnD92rkP3a/OZH3dQt2/36txf1qpb/fq3F/Wspbnm1izF2qzF95arRdqsxfeWokefV3Lsf3BVqCqsf3BVqCsZnm1ty5BViPoKrwVYj6CspbHm1di7D92rMX36rQ/dqzF9+sZbnn1di9D1qxBVeHrViCs5bnl1Ni5b9KtxfdWqlv0q3F91aiR51Qt2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UUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAB1ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAryf9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AOVrUP8A4/XpHwP/AGbvBH7N+lX1n4L0C30WHUpVmumEss8s7KMKGklZnKqM4XO1SzEAFmJAO4ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9k=", "width": 100, "alignH": "left", "alignV": "top", "height": 100, "canGrow": true, "imageId": "51e6183d-3b69-4c0b-8005-2584b9517246", "aspectRatio": 9.5}, "zIndex": 0, "position": {"x": 10, "y": 10}}], "metadata": {}, "dimensions": {"unit": "mm", "height": 150}, "printRules": {"everyPage": true}}	2025-12-07 20:51:38.124174	Header
6c80da62-a39e-4b52-9b18-49a7a856e7a3	5ce0fd0e-57b3-4a4b-83ea-bd9b9b3e4f4c	body	1	f	{"style": {"backgroundColor": "#ffffff"}, "blocks": [], "metadata": {}, "dimensions": {"unit": "mm", "minHeight": 100}, "printRules": {"everyPage": true}}	2025-12-07 20:51:38.357624	Body - Line Items
77cb8a51-ab45-44e8-830b-bef6dcf785c9	5ce0fd0e-57b3-4a4b-83ea-bd9b9b3e4f4c	footer	2	f	{"style": {"padding": {"top": 10, "left": 10, "right": 10, "bottom": 10}, "borderColor": "#e5e7eb", "borderStyle": "solid", "borderWidth": 1, "backgroundColor": "#f9fafb"}, "blocks": [], "metadata": {}, "dimensions": {"unit": "mm", "height": 80}, "printRules": {"everyPage": true}}	2025-12-07 20:51:38.489428	Footer - Totals & Conditions
\.


--
-- Data for Name: packing_list_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.packing_list_items (id, packing_list_id, item_id, quantity, packed_quantity) FROM stdin;
\.


--
-- Data for Name: packing_lists; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.packing_lists (id, packing_number, invoice_id, project_id, customer_id, status, shipping_address, shipping_method, tracking_number, weight, dimensions, notes, created_at) FROM stdin;
\.


--
-- Data for Name: payment_days; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payment_days (id, days, name_nl, name_en, description_nl, description_en, is_active, sort_order, created_at) FROM stdin;
905d1fba-5615-4345-bbab-a5748b248176	0	Direct	Direct	Betaling direct	Payment direct	t	1	2025-10-10 14:18:43.273826
333d11d7-4ad5-44eb-aa85-c4330918c602	7	7 dagen	7 days	Betaling binnen 7 dagen	Payment within 7 days	t	2	2025-10-10 14:18:43.273826
22456c44-8edc-47c7-9ae7-47513d7e7ac2	14	14 dagen	14 days	Betaling binnen 14 dagen	Payment within 14 days	t	3	2025-10-10 14:18:43.273826
a8fab9a1-b836-4ce3-8922-69b626084abd	30	30 dagen	30 days	Betaling binnen 30 dagen	Payment within 30 days	t	4	2025-10-10 14:18:43.273826
2b30c656-480c-4cb4-a2e0-9974b869a1c5	60	60 dagen	60 days	Betaling binnen 60 dagen	Payment within 60 days	t	5	2025-10-10 14:18:43.273826
727ed714-85b4-4f45-93d6-7e04869c9e69	90	90 dagen	90 days	Betaling binnen 90 dagen	Payment within 90 days	t	6	2025-10-10 14:18:43.273826
\.


--
-- Data for Name: payment_schedules; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payment_schedules (id, code, name_nl, name_en, schedule_items, is_active, sort_order, created_at) FROM stdin;
0e83c437-4de3-47f3-82ca-0448f9a51428	100	100%	100%	[{"moment_en": "direct", "moment_nl": "direct", "percentage": 100}]	t	1	2025-10-10 14:18:54.939033
2cd021ee-5af3-41b6-a2f2-fde026f44b30	50_30_10_10	50-30-10-10	50-30-10-10	[{"moment_en": "by order", "moment_nl": "bij order", "percentage": 50}, {"moment_en": "before shipment", "moment_nl": "voor verzending", "percentage": 30}, {"moment_en": "on arrival", "moment_nl": "bij aankomst", "percentage": 10}, {"moment_en": "after SAT", "moment_nl": "na SAT", "percentage": 10}]	t	2	2025-10-10 14:18:54.939033
\.


--
-- Data for Name: payment_terms; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payment_terms (id, code, name, days, description, is_active, created_at) FROM stdin;
93f188ef-2c44-4be9-aa27-d55eeed195b0	NET15	Net 15 dagen	15	Betaling binnen 15 dagen	t	2025-09-10 08:33:07.849336
6662f126-6a06-482d-af36-132ceea72170	NET30	Net 30 dagen	30	Betaling binnen 30 dagen	t	2025-09-10 08:33:07.849336
57073f25-5929-4c21-9b92-67da0c8c34bb	NET60	Net 60 dagen	60	Betaling binnen 60 dagen	t	2025-09-10 08:33:07.849336
21bfd8de-37f0-4779-b450-987d008a7984	DIRECT	Direct betalen	0	Directe betaling vereist	t	2025-09-10 08:33:07.849336
\.


--
-- Data for Name: proforma_invoices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.proforma_invoices (id, proforma_number, customer_id, quotation_id, project_id, status, due_date, subtotal, tax_amount, total_amount, notes, created_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.projects (id, name, description, customer_id, status, start_date, end_date, total_value, progress, created_at, project_number) FROM stdin;
\.


--
-- Data for Name: prospects; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.prospects (id, prospect_number, first_name, last_name, company_name, email, phone, mobile, "position", industry, source, status, priority, estimated_value, notes, assigned_to, next_follow_up, last_contact_date, conversion_date, customer_id, address_id, deleted_at, created_at) FROM stdin;
\.


--
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.purchase_order_items (id, purchase_order_id, item_id, quantity, unit_price, line_total) FROM stdin;
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.purchase_orders (id, order_number, supplier_id, status, order_date, expected_date, subtotal, tax_amount, total_amount, notes, created_at) FROM stdin;
\.


--
-- Data for Name: quotation_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quotation_items (id, quotation_id, item_id, description, quantity, unit_price, line_total, line_type, "position", source_snippet_id, source_snippet_version) FROM stdin;
4483c986-d46c-4ec8-9fc7-6c8d9a8073fd	test-quotation-1	\N	Standard Product Item	2	25.00	50.00	standard	0	\N	\N
719c11f0-e795-4bba-88f4-e5d5c0419a96	test-quotation-1	\N	Custom Engineered Component	1	150.00	150.00	unique	0	\N	\N
c7dfae2f-9fba-48d7-a731-9265289d2626	test-quotation-1	\N	--- Project Header Text ---	0	0.00	0.00	text	0	\N	\N
8516fea2-da18-4945-ad9f-be215f4fb9c7	test-quotation-1	\N	Shipping and Handling Fee	1	15.00	15.00	charges	0	\N	\N
\.


--
-- Data for Name: quotation_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quotation_requests (id, request_number, customer_id, project_id, status, request_date, due_date, title, description, requirements, estimated_budget, priority, notes, created_at) FROM stdin;
\.


--
-- Data for Name: quotations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quotations (id, quotation_number, customer_id, project_id, status, quotation_date, description, revision_number, valid_until, subtotal, tax_amount, total_amount, notes, inco_terms, payment_conditions, delivery_conditions, created_at, validity_days, is_budget_quotation) FROM stdin;
13d2537c-3233-4473-9d81-abd9134a33ec	Q-2025-001	a476ef35-b76b-41de-80bc-0e19310508b4	\N	draft	2025-05-23 00:00:00	Ford Focus Electric	V1.0	2025-06-22 00:00:00	0.00	0.00	0.00					2025-09-10 13:00:01.6668	30	t
bdd41ef8-a87a-4db8-a673-4c022b7a611b	Q-2025-002	1698a4d0-7d34-4685-b256-1d0cf6e5200b	\N	draft	2025-09-12 00:00:00	test	V1.0	2025-09-26 00:00:00	0.00	0.00	0.00					2025-09-12 14:41:09.608161	14	f
test-quotation-1	Q-TEST-001	1698a4d0-7d34-4685-b256-1d0cf6e5200b	\N	draft	2025-09-16 00:00:00	Test Quotation for Type Column Testing	V1.0	2025-10-16 00:00:00	215.00	45.15	260.15					2025-09-16 11:24:08.732748	30	f
\.


--
-- Data for Name: sales_order_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sales_order_items (id, sales_order_id, item_id, quantity, unit_price, line_total, description, line_type, "position", source_snippet_id, source_snippet_version) FROM stdin;
e36c6323-d865-49ed-850a-dc4a00ffde96	1448196f-3bbc-4bdf-a631-2bf914a8ed6d	\N	2	25.00	50.00	Standard Product Item	standard	0	\N	\N
15ce014d-a5b1-469b-883e-7699bc0d1ad5	1448196f-3bbc-4bdf-a631-2bf914a8ed6d	\N	1	150.00	150.00	Custom Engineered Component	unique	0	\N	\N
085b4555-4677-432a-ab11-aad9c2af2a00	1448196f-3bbc-4bdf-a631-2bf914a8ed6d	\N	0	0.00	0.00	--- Project Header Text ---	text	0	\N	\N
a8cc013d-de1a-4f75-8dbf-04fde8ce9171	1448196f-3bbc-4bdf-a631-2bf914a8ed6d	\N	1	15.00	15.00	Shipping and Handling Fee	charges	0	\N	\N
\.


--
-- Data for Name: sales_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sales_orders (id, order_number, customer_id, status, order_date, expected_delivery_date, subtotal, tax_amount, total_amount, notes, created_at) FROM stdin;
1448196f-3bbc-4bdf-a631-2bf914a8ed6d	SO-1758032397215	1698a4d0-7d34-4685-b256-1d0cf6e5200b	pending	2025-09-16 14:19:57.215	\N	100.00	0.00	121.00	\N	2025-09-16 14:19:57.230287
\.


--
-- Data for Name: statuses; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.statuses (id, code, name, category, color, description, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.suppliers (id, supplier_number, name, email, phone, address, contact_person, tax_id, payment_terms, status, deleted_at, created_at) FROM stdin;
f730574d-fef4-498d-9dee-810edfdb9bfa	CRED-001	Wim Horseling	Wim@hotmail.com	0612345678	Bosrand 29	Wim Horseling	1234	14	active	\N	2025-09-11 09:21:42.965416
5a5b464e-dfbb-46a5-9382-d2d05d9b806f	CRED-004	Wayu	wayyu@shr					30	active	\N	2025-11-04 06:00:36.177842
\.


--
-- Data for Name: text_snippet_usages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.text_snippet_usages (id, snippet_id, doc_type, doc_id, doc_line_id, version_used, used_at) FROM stdin;
\.


--
-- Data for Name: text_snippets; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.text_snippets (id, code, title, body, category, locale, version, is_active, created_at, updated_at) FROM stdin;
84903628-5d89-4748-8644-16daa72a79ad	WELCOME	Welcome Message	Welcome to our services. We appreciate your business.	header	en	1	t	2025-09-16 14:24:42.730385	2025-09-16 14:24:42.730385
4b326653-83aa-473b-85d6-4e21beea6c01	TERMS	Payment Terms	Payment terms: Net 30 days from invoice date.	footer	en	1	t	2025-09-16 14:24:42.730385	2025-09-16 14:24:42.730385
2d225aa8-2d09-44ff-8fee-876054b99c11	WARRANTY	Standard Warranty	12-month manufacturer warranty included on all products.	general	en	1	t	2025-09-16 14:24:42.730385	2025-09-16 14:24:42.730385
\.


--
-- Data for Name: units_of_measure; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.units_of_measure (id, code, name, description, category, is_active, created_at) FROM stdin;
73168d0f-8165-4bea-a937-7f048b6eeaf9	TEST	Test Unit	Test description	quantity	t	2025-09-17 15:17:33.571408
6c603301-47b4-47a1-910e-88c96e77a97b	RESTART	Updated After Restart	Updated description after restart	quantity	f	2025-09-17 15:19:05.247287
a7cbcd75-fbb2-499a-a373-ef30a22eea27	TST	Test Unit	\N	\N	t	2025-09-17 15:42:46.905309
\.


--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_preferences (id, user_id, navigation_order, collapsed_sections, created_at, updated_at, last_active_tab, last_active_tab_type) FROM stdin;
96789f0b-4c61-42e9-a677-b4fa1f443799	\N	\N	\N	2025-09-22 10:21:05.293288	2025-09-22 10:21:05.293288	\N	\N
d79808a0-8630-49ac-9904-ce4d3c6c499c	\N	\N	\N	2025-09-22 10:21:08.025731	2025-09-22 10:21:08.025731	\N	\N
f21cc51f-ff1c-4b93-accd-91f6ae0b583e	\N	\N	\N	2025-09-22 10:21:11.129329	2025-09-22 10:21:11.129329	\N	\N
321be407-e294-479c-90a1-6c481476eaab	\N	\N	\N	2025-09-22 10:23:24.664082	2025-09-22 10:23:24.664082	\N	\N
51526751-a82d-465d-be24-4f5b63226a20	\N	\N	\N	2025-09-22 10:31:23.085318	2025-09-22 10:31:23.085318	\N	\N
929504d1-36e6-4c7a-8813-d7396a6e1c49	\N	\N	\N	2025-09-22 10:31:26.51859	2025-09-22 10:31:26.51859	\N	\N
525d2f92-9632-4569-a1d4-d544f575174a	\N	\N	\N	2025-09-22 10:31:29.446269	2025-09-22 10:31:29.446269	\N	\N
de559233-acf9-4b8f-803b-acc29736c5b4	\N	\N	\N	2025-09-22 10:35:46.006579	2025-09-22 10:35:46.006579	\N	\N
d85a979b-dd4e-497a-b80e-29cf2fdaf949	\N	\N	\N	2025-09-22 10:35:48.717056	2025-09-22 10:35:48.717056	\N	\N
4307a2ba-fe45-49ff-92e5-3e8f8cf4c11c	\N	\N	\N	2025-09-22 10:35:59.046355	2025-09-22 10:35:59.046355	\N	\N
2011a827-1d81-40f4-b062-906f6ac8ee3b	\N	\N	\N	2025-09-22 10:36:02.348665	2025-09-22 10:36:02.348665	\N	\N
ca077aaf-96c5-4775-8fff-d46f656f39c9	\N	\N	\N	2025-09-22 10:36:05.726045	2025-09-22 10:36:05.726045	\N	\N
f2d773ed-2537-408b-a253-2fe03d39cbaf	\N	\N	\N	2025-09-22 13:01:09.19048	2025-09-22 13:01:09.19048	\N	\N
314b82c6-9d71-4583-b3f2-1a19017a9b83	\N	\N	\N	2025-09-22 13:46:27.904336	2025-09-22 13:46:27.904336	\N	\N
52a7adca-6e4d-4eda-b73e-a1d14bcae5a1	\N	\N	\N	2025-09-22 13:46:30.090278	2025-09-22 13:46:30.090278	\N	\N
4264815a-6edc-4c7a-9f1e-d5bc98dadb51	\N	\N	\N	2025-09-22 13:46:33.167155	2025-09-22 13:46:33.167155	\N	\N
f7c0c1fa-9996-407e-b47a-b30089d84442	\N	\N	\N	2025-09-22 13:46:36.761394	2025-09-22 13:46:36.761394	\N	\N
28b6ebc8-8c4a-4d2a-8655-95c987afc9d8	\N	\N	\N	2025-09-22 14:05:55.811948	2025-09-22 14:05:55.811948	\N	\N
c08f92a8-898c-4597-ab00-a6b4c350bbb0	\N	\N	\N	2025-09-22 14:17:50.707516	2025-09-22 14:17:50.707516	\N	\N
15af0bfe-d4c0-4a32-9cd8-784d68174ad0	\N	\N	\N	2025-09-22 14:41:54.564247	2025-09-22 14:41:54.564247	\N	\N
3d275771-d966-44a6-9887-366c47283567	\N	\N	\N	2025-09-22 19:01:09.371927	2025-09-22 19:01:09.371927	\N	\N
c702bed4-d88b-48b5-bc1d-d6d65a5fcb1c	\N	\N	\N	2025-09-22 19:05:20.971509	2025-09-22 19:05:20.971509	\N	\N
36c2d2a7-ad63-43f2-ab83-9e0b626a5d40	\N	\N	\N	2025-09-22 19:08:13.924668	2025-09-22 19:08:13.924668	\N	\N
125c7279-424b-47af-aafe-c80979befc33	\N	\N	\N	2025-09-22 19:12:15.000362	2025-09-22 19:12:15.000362	\N	\N
abdccdb1-edf0-484b-a0b7-de7e9a9e59db	\N	\N	\N	2025-09-22 19:21:02.920615	2025-09-22 19:21:02.920615	\N	\N
47064411-0a6a-488b-8222-0f6811c55471	\N	\N	\N	2025-09-22 19:27:51.156368	2025-09-22 19:27:51.156368	\N	\N
d62c8294-fcd5-47f2-b32a-561a86f92137	\N	\N	\N	2025-09-22 19:33:29.09286	2025-09-22 19:33:29.09286	\N	\N
75870a87-378b-4414-bd4e-b975869933bf	\N	\N	\N	2025-09-22 19:47:43.717745	2025-09-22 19:47:43.717745	\N	\N
33009bdf-c020-4020-92c3-cb28e217a0e5	\N	\N	\N	2025-09-22 19:59:39.379491	2025-09-22 19:59:39.379491	\N	\N
4bb96014-d5b8-42ac-892c-1bc167c295ec	\N	\N	\N	2025-09-22 20:05:45.613356	2025-09-22 20:05:45.613356	\N	\N
9c40e437-8ed9-493e-9f92-65f08bc77b2b	\N	\N	\N	2025-09-22 20:14:17.985166	2025-09-22 20:14:17.985166	\N	\N
4731ccbd-2fc3-45fd-b6d1-08609edd4e3e	\N	\N	\N	2025-09-22 20:17:40.428614	2025-09-22 20:17:40.428614	\N	\N
99be1ab0-e961-45db-a1d9-687455198d19	\N	\N	\N	2025-09-22 20:18:31.947381	2025-09-22 20:18:31.947381	\N	\N
f0e635b8-7fb1-4d43-83f3-24347172a468	\N	\N	\N	2025-09-22 20:27:37.89401	2025-09-22 20:27:37.89401	\N	\N
4907e9cb-ffc5-4de3-b6ab-c2b3a082c0a2	\N	\N	\N	2025-09-22 20:46:09.171142	2025-09-22 20:46:09.171142	\N	\N
5af4cfe7-df9e-4857-bec2-4909b8efc9c7	\N	\N	\N	2025-09-23 08:10:59.798284	2025-09-23 08:10:59.798284	\N	\N
5018ae6c-fc92-4bb5-94c0-429970af36de	\N	\N	\N	2025-09-23 11:08:50.771764	2025-09-23 11:08:50.771764	\N	\N
8e9a3454-d60b-4bf1-8544-35322e1834fd	\N	\N	\N	2025-09-23 11:25:46.034479	2025-09-23 11:25:46.034479	\N	\N
b843f101-0a65-4f0d-b157-d2833df776b8	\N	\N	\N	2025-09-23 11:28:56.813624	2025-09-23 11:28:56.813624	\N	\N
6af7bf24-49c9-4a44-babd-faec297a16f3	\N	\N	\N	2025-09-23 11:46:33.194875	2025-09-23 11:46:33.194875	\N	\N
afd29778-7d0d-46bf-bad1-7a45aaba416d	\N	\N	\N	2025-09-23 13:46:25.59946	2025-09-23 13:46:25.59946	\N	\N
f02021ec-e535-43c3-843a-0592fe2d432b	\N	\N	\N	2025-09-23 14:04:38.107789	2025-09-23 14:04:38.107789	\N	\N
d6164c6d-193a-483b-b58f-0a3917c4f94c	\N	\N	\N	2025-09-23 14:20:20.685584	2025-09-23 14:20:20.685584	\N	\N
9bd744da-c26d-4c47-995d-aae50711f79a	\N	\N	\N	2025-09-24 06:36:57.866981	2025-09-24 06:36:57.866981	\N	\N
35454368-7e35-415e-880e-8c4c7c324cf3	\N	\N	\N	2025-09-24 06:41:40.064287	2025-09-24 06:41:40.064287	\N	\N
43477a77-3a0a-45cf-833e-1a5645c6c7ea	\N	\N	\N	2025-09-24 07:15:46.16384	2025-09-24 07:15:46.16384	\N	\N
6556d5d4-9df3-4e89-b3fc-cadf7922b665	\N	\N	\N	2025-09-24 07:47:25.907246	2025-09-24 07:47:25.907246	\N	\N
4313f2f1-9c03-4b2f-a3ff-aad8957637c6	\N	\N	\N	2025-09-24 07:58:31.797727	2025-09-24 07:58:31.797727	\N	\N
4e835c4d-9c7b-4cd2-8063-14b189c708dd	\N	\N	\N	2025-09-24 08:05:50.048905	2025-09-24 08:05:50.048905	\N	\N
75ba00bf-f1b4-4c7c-a32d-2de111d65fb5	\N	\N	\N	2025-09-24 11:23:33.889833	2025-09-24 11:23:33.889833	\N	\N
fd0e3171-787f-4f26-9107-94daf13ac592	\N	\N	\N	2025-09-24 12:33:02.55789	2025-09-24 12:33:02.55789	\N	\N
24b16312-d52a-43f7-a85f-4c0b228a6cd4	\N	\N	\N	2025-09-24 12:50:21.147444	2025-09-24 12:50:21.147444	\N	\N
41596186-a516-4ac7-871b-fb9b346b562e	\N	\N	\N	2025-09-24 13:22:43.753015	2025-09-24 13:22:43.753015	\N	\N
5e83f8d0-51ef-49a4-b54f-43a187cfd085	\N	\N	\N	2025-09-24 14:15:39.287302	2025-09-24 14:15:39.287302	\N	\N
f42f81c4-a1f7-4dee-a087-e245176b0fd2	\N	\N	\N	2025-09-24 16:54:45.986581	2025-09-24 16:54:45.986581	\N	\N
646d5bcb-aa78-4987-840d-f253efc3fd04	\N	\N	\N	2025-09-24 17:45:28.232878	2025-09-24 17:45:28.232878	\N	\N
c3dea625-2fca-4714-b7b0-7ab7e40752bb	\N	\N	\N	2025-09-24 17:50:13.02997	2025-09-24 17:50:13.02997	\N	\N
b78070f4-2309-49ff-adab-f002bfa5de49	\N	\N	\N	2025-09-24 17:50:19.106469	2025-09-24 17:50:19.106469	\N	\N
d766a71a-0e4f-4ee3-8f11-2b91ac2a26f6	\N	\N	\N	2025-09-24 17:58:38.876767	2025-09-24 17:58:38.876767	\N	\N
dc831f5f-6059-4672-a6f4-9ee21992016f	\N	\N	\N	2025-09-24 18:04:34.092668	2025-09-24 18:04:34.092668	\N	\N
40d2abd4-7ee2-41b1-b3a9-b4a40857dd59	\N	\N	\N	2025-09-26 07:57:00.57598	2025-09-26 07:57:00.57598	\N	\N
39a8f7c9-25a0-4a35-9d35-1b0f385d4b2c	\N	\N	\N	2025-09-26 09:32:08.379624	2025-09-26 09:32:08.379624	\N	\N
1c32f308-562b-4834-9a61-52f401a1dd2d	\N	\N	\N	2025-09-26 14:42:20.572911	2025-09-26 14:42:20.572911	\N	\N
f11a6624-0955-4de2-b2d8-f25ef4f05c92	\N	\N	\N	2025-10-08 11:27:00.988272	2025-10-08 11:27:00.988272	\N	\N
2ad8eae8-0250-4e69-8a34-86f0df26e666	\N	\N	\N	2025-10-08 11:34:00.821962	2025-10-08 11:34:00.821962	\N	\N
b976ce25-2fe6-469b-b63b-75367cd76ab0	\N	\N	\N	2025-10-08 11:43:12.765296	2025-10-08 11:43:12.765296	\N	\N
1b70bba1-0a77-45fb-8eac-0b6256c30bb9	\N	\N	\N	2025-10-08 11:44:24.580067	2025-10-08 11:44:24.580067	\N	\N
50d330f6-2bd1-4e2f-97fe-4233ae55c66e	\N	\N	\N	2025-10-08 11:47:29.865145	2025-10-08 11:47:29.865145	\N	\N
f2982dc3-4a43-44e7-89c9-5119ac1ee75b	\N	\N	\N	2025-10-08 12:24:59.174886	2025-10-08 12:24:59.174886	\N	\N
92724f6c-a54f-454c-a69f-26a6ea3cb399	\N	\N	\N	2025-10-09 11:54:21.441215	2025-10-09 11:54:21.441215	\N	\N
9af5e4e0-7d58-4c45-9412-c94213e8d2a9	\N	\N	\N	2025-10-09 11:56:43.375198	2025-10-09 11:56:43.375198	\N	\N
cbf1318a-3f80-4a27-87d3-0392c679a3e6	\N	\N	\N	2025-10-09 11:56:48.176747	2025-10-09 11:56:48.176747	\N	\N
f3d0cf2e-fa11-443f-8d28-d037d8e87fd8	\N	\N	\N	2025-10-09 12:02:59.841509	2025-10-09 12:02:59.841509	\N	\N
af4101e3-b1a0-4a0d-8e90-8327cab31949	\N	\N	\N	2025-10-09 14:07:32.220525	2025-10-09 14:07:32.220525	\N	\N
59c820f1-c531-469b-8f8b-237bcd17a2b6	\N	\N	\N	2025-10-09 14:22:55.550763	2025-10-09 14:22:55.550763	\N	\N
91ad6fc1-df22-41b1-b6c6-1c7492ac1eca	\N	\N	\N	2025-10-09 14:45:55.800646	2025-10-09 14:45:55.800646	\N	\N
0967cd6e-9d9d-477b-b59d-0fefb0182f8c	\N	\N	\N	2025-10-09 15:13:13.836039	2025-10-09 15:13:13.836039	\N	\N
4bba4ecd-ecd8-4df0-9c50-93ed4a35286d	\N	\N	\N	2025-10-10 06:33:57.18579	2025-10-10 06:33:57.18579	\N	\N
400f3b05-6492-4076-aa0a-ab859c76c35c	\N	\N	\N	2025-10-15 12:53:09.27974	2025-10-15 12:53:09.27974	\N	\N
66f83f6d-7f67-47bd-8ba7-4d7fc17078d4	\N	\N	\N	2025-10-15 13:04:21.338516	2025-10-15 13:04:21.338516	\N	\N
2164d381-8b03-4fed-b318-53dd2ece6134	\N	\N	\N	2025-10-15 13:10:34.068695	2025-10-15 13:10:34.068695	\N	\N
007c7e9f-80ae-47fe-9970-9be0a03096a1	\N	\N	\N	2025-10-15 13:10:39.87541	2025-10-15 13:10:39.87541	\N	\N
c79c7d26-e2b9-4631-964a-0defeea9193f	\N	\N	\N	2025-10-15 20:32:30.65705	2025-10-15 20:32:30.65705	\N	\N
0da722e8-d7f0-4807-aa06-d2e85274a587	\N	\N	\N	2025-10-16 19:14:24.757301	2025-10-16 19:14:24.757301	\N	\N
e481a4fd-99e2-4e0e-9681-55233b00bf25	\N	\N	\N	2025-10-20 13:27:43.342002	2025-10-20 13:27:43.342002	\N	\N
1a1fe949-7373-4122-a763-047c17a016cc	\N	\N	\N	2025-10-22 09:37:02.054438	2025-10-22 09:37:02.054438	\N	\N
243925b0-04ab-402d-a2c5-4b06de334f78	\N	\N	\N	2025-10-22 09:41:41.437919	2025-10-22 09:41:41.437919	\N	\N
bc97c2ba-ba55-4ed6-89f7-a0acf7ddd26c	\N	\N	\N	2025-10-22 09:37:10.255269	2025-10-22 09:37:10.255269	\N	\N
51bedae3-0702-4d36-b599-b944b48cd977	\N	\N	\N	2025-10-22 09:37:06.625812	2025-10-22 09:37:06.625812	\N	\N
e6b8a579-be7a-4154-bd13-c02c35874f01	\N	\N	\N	2025-10-22 09:37:11.725634	2025-10-22 09:37:11.725634	\N	\N
e4e47090-cafe-4e5d-86e8-2581205ad07a	\N	\N	\N	2025-10-31 17:55:38.441407	2025-10-31 17:55:38.441407	\N	\N
4b569dfa-5e3a-43fa-8a2d-d234a5ba796c	\N	\N	\N	2025-10-31 17:56:26.401245	2025-10-31 17:56:26.401245	\N	\N
05e6da97-e04a-41a7-a650-c7a598b3eee3	\N	\N	\N	2025-09-22 10:23:31.840353	2025-09-22 10:23:31.840353	\N	\N
80c6b49b-f7f0-4cf4-977f-be7ba67d4b7c	\N	\N	\N	2025-09-22 10:24:08.824502	2025-09-22 10:24:08.824502	\N	\N
12db7b6e-8268-4e29-8812-5dd4d6a8399f	\N	\N	\N	2025-09-22 10:31:42.749719	2025-09-22 10:31:42.749719	\N	\N
df7edf64-a1cc-47a3-99f5-6285a77ff1b5	\N	\N	\N	2025-09-22 10:35:52.286699	2025-09-22 10:35:52.286699	\N	\N
4686329f-108d-49f6-b119-21a6a99b7350	\N	\N	\N	2025-09-22 19:59:54.180578	2025-09-22 19:59:54.180578	\N	\N
5c3192fe-c301-492f-aaf1-87a167189ef9	\N	\N	\N	2025-09-22 20:07:27.662342	2025-09-22 20:07:27.662342	\N	\N
7cd71abe-846b-499c-9360-69d5ee2cdd51	\N	\N	\N	2025-09-22 20:07:35.753714	2025-09-22 20:07:35.753714	\N	\N
93ea0642-a7a6-458a-b5ae-9439f00d2c08	\N	\N	\N	2025-09-22 20:14:34.024263	2025-09-22 20:14:34.024263	\N	\N
68486b2b-a6d0-444d-8864-0da49dbe6905	\N	\N	\N	2025-09-22 20:46:45.157031	2025-09-22 20:46:45.157031	\N	\N
b53b5450-7edf-470e-bf25-b05f3e98d972	\N	\N	\N	2025-09-26 14:45:35.111743	2025-09-26 14:45:35.111743	\N	\N
395b9dbe-6cf9-4e31-bddf-c38af12c0b51	\N	\N	\N	2025-10-08 11:34:31.315723	2025-10-08 11:34:31.315723	\N	\N
51ef85e2-3499-4589-8bbe-f237112b0af0	\N	\N	\N	2025-10-08 11:35:32.115683	2025-10-08 11:35:32.115683	\N	\N
77d2adc8-f083-4540-a52e-a96a04c401aa	\N	\N	\N	2025-10-08 11:44:38.085268	2025-10-08 11:44:38.085268	\N	\N
82646469-eec7-4e08-8f4d-35f62ab33a6e	\N	\N	\N	2025-10-15 12:53:21.965958	2025-10-15 12:53:21.965958	\N	\N
61ebb443-969f-41b5-a381-da36dd98c9e9	\N	\N	\N	2025-10-15 20:32:33.877817	2025-10-15 20:32:33.877817	\N	\N
95e83944-e9e3-4673-be79-cc1adacb260e	\N	\N	\N	2025-10-16 19:14:50.128828	2025-10-16 19:14:50.128828	\N	\N
95b1fb8d-5d7f-4a0c-9a9e-6f90fa68d4be	\N	\N	\N	2025-10-22 09:42:09.200511	2025-10-22 09:42:09.200511	\N	\N
dc36e492-f0a5-489a-96a1-1dd483f2c29b	\N	\N	\N	2025-11-04 05:59:06.081321	2025-11-04 05:59:06.081321	\N	\N
cb1fd71e-78eb-4e3e-a375-17a4d8f7f921	\N	\N	\N	2025-09-22 10:31:48.37214	2025-09-22 10:31:48.37214	\N	\N
6c287b69-30d1-4fd1-a72e-9ecf8f79ba8d	\N	\N	\N	2025-09-26 14:45:59.980873	2025-09-26 14:45:59.980873	\N	\N
f1e4e83c-e50c-48ec-bb45-a0df70b947bf	\N	\N	\N	2025-10-08 11:35:34.926312	2025-10-08 11:35:34.926312	\N	\N
643453f0-2116-410e-ba84-d2041da0af29	\N	\N	\N	2025-10-08 11:44:51.268995	2025-10-08 11:44:51.268995	\N	\N
d1b245c9-c0f3-4343-ba46-73e9ad5fd79d	\N	\N	\N	2025-10-08 11:44:58.431014	2025-10-08 11:44:58.431014	\N	\N
6928359f-1d21-4352-90e0-d29ba8b0a417	\N	\N	\N	2025-10-15 12:53:38.307244	2025-10-15 12:53:38.307244	\N	\N
8a2f3f56-89d9-437e-bdb4-4eb57b012b6b	\N	\N	\N	2025-11-04 05:59:11.454891	2025-11-04 05:59:11.454891	\N	\N
06d66f0d-de5e-4ea3-9d4b-d7788f178586	\N	\N	\N	2025-09-22 10:32:27.851452	2025-09-22 10:32:27.851452	\N	\N
3e7c10eb-37bc-4652-86b8-8395c66577b6	\N	\N	\N	2025-09-22 10:33:40.853458	2025-09-22 10:33:40.853458	\N	\N
53137e7e-35d4-47eb-b9bb-96d72eba6af5	\N	\N	\N	2025-10-08 11:35:41.078169	2025-10-08 11:35:41.078169	\N	\N
0ce09a8c-cd50-489e-9f26-f095d9660c63	\N	\N	\N	2025-10-08 11:35:46.126946	2025-10-08 11:35:46.126946	\N	\N
2fca0ce6-3f0b-4faf-b27d-c37ad7c6d4f5	\N	\N	\N	2025-10-08 11:35:48.836258	2025-10-08 11:35:48.836258	\N	\N
f6ad4110-47ad-44a2-a5b7-d61fce1c4bf8	\N	\N	\N	2025-10-08 11:35:51.611027	2025-10-08 11:35:51.611027	\N	\N
19b665db-5511-4ba6-975f-04093059ea7a	\N	\N	\N	2025-10-08 11:44:54.084473	2025-10-08 11:44:54.084473	\N	\N
4883e505-0998-4df4-a0b4-06a0773ded68	\N	\N	\N	2025-11-04 05:59:46.47896	2025-11-04 05:59:46.47896	\N	\N
b3b0654b-d950-475c-b7d6-4592e3d7a7d6	admin	[{"id": "overview", "name": "Overview", "items": [{"id": "dashboard", "href": "/dashboard", "icon": {}, "name": "Dashboard"}], "collapsible": true}, {"id": "relations", "name": "Relations", "items": [{"id": "customers", "href": "/customers", "icon": {}, "name": "Customers"}, {"id": "suppliers", "href": "/suppliers", "icon": {}, "name": "Suppliers"}, {"id": "contact-persons", "href": "/contact-persons", "icon": {}, "name": "Contact Persons"}, {"id": "addresses", "href": "/addresses", "icon": {}, "name": "Addresses"}, {"id": "prospects", "href": "/prospects", "icon": {}, "name": "Prospects"}], "collapsible": true}, {"id": "inventory", "name": "Inventory", "items": [{"id": "stock", "href": "/inventory", "icon": {}, "name": "Stock Management"}, {"id": "purchase-orders", "href": "/purchase-orders", "icon": {}, "name": "Purchase Orders"}], "collapsible": true}, {"id": "master-data", "name": "Master Data", "items": [{"id": "company-details", "href": "/master-data/company-details", "icon": {}, "name": "Our Company Details"}, {"id": "text-snippets", "href": "/text-snippets", "icon": {}, "name": "Text Snippets"}, {"id": "images", "href": "/master-data/images", "icon": {}, "name": "Images"}, {"id": "uom", "href": "/master-data/uom", "icon": {}, "name": "Units of Measure"}, {"id": "payment-terms", "href": "/master-data/payment-terms", "icon": {}, "name": "Payment Terms"}, {"id": "incoterms", "href": "/master-data/incoterms", "icon": {}, "name": "Incoterms"}, {"id": "vat", "href": "/master-data/vat", "icon": {}, "name": "VAT Rates"}, {"id": "cities", "href": "/master-data/cities", "icon": {}, "name": "Cities"}, {"id": "statuses", "href": "/master-data/statuses", "icon": {}, "name": "Statuses"}], "collapsible": true}, {"id": "sales", "name": "Sales", "items": [{"id": "quotations", "href": "/quotations", "icon": {}, "name": "Quotations"}, {"id": "proforma", "href": "/proforma-invoices", "icon": {}, "name": "Proforma Invoices"}, {"id": "orders", "href": "/sales-orders", "icon": {}, "name": "Paga"}, {"id": "confirmations", "href": "/order-confirmations", "icon": {}, "name": "Order Confirmations"}, {"id": "sales-projects", "href": "/projects", "icon": {}, "name": "Projects"}, {"id": "sales-work", "href": "/work-orders", "icon": {}, "name": "Work Orders"}, {"id": "sales-packing", "href": "/packing-lists", "icon": {}, "name": "Packing Lists"}], "collapsible": true}, {"id": "operations", "name": "Operations", "items": [{"id": "projects", "href": "/projects", "icon": {}, "name": "Projects"}, {"id": "work-orders", "href": "/work-orders", "icon": {}, "name": "Work Orders"}, {"id": "packing-lists", "href": "/packing-lists", "icon": {}, "name": "Packing Lists"}], "collapsible": true}, {"id": "reports", "name": "Reports", "items": [{"id": "analytics", "href": "/reports", "icon": {}, "name": "Analytics"}], "collapsible": true}, {"id": "tools", "name": "Tools", "items": [{"id": "layout-designer", "href": "/layout-designer", "icon": {}, "name": "Layout Designer"}], "collapsible": true}]	{"Sales": true, "Tools": false, "Reports": true, "Overview": true, "Inventory": true, "Relations": false, "Operations": true, "Master Data": true}	2025-10-21 08:05:37.652363	2025-12-10 15:01:39.994187	layout-designer	page
d81ed116-2409-445a-88cf-5264cf9bf583	\N	\N	\N	2025-09-22 10:33:18.85017	2025-09-22 10:33:18.85017	\N	\N
b47f0c3f-3558-45be-88e4-007a46b3cb24	\N	\N	\N	2025-10-08 11:36:49.350626	2025-10-08 11:36:49.350626	\N	\N
eaa89a62-4781-4d45-811d-8b6b28753771	\N	\N	\N	2025-10-08 11:37:34.058094	2025-10-08 11:37:34.058094	\N	\N
5a687c54-1acf-4218-8adc-3f38e6dfc1f4	\N	\N	\N	2025-11-04 06:00:53.2178	2025-11-04 06:00:53.2178	\N	\N
2b2900ed-71eb-4de0-9b0d-4ebd9e199671	\N	\N	\N	2025-10-08 11:41:09.710201	2025-10-08 11:41:09.710201	\N	\N
f5ee5b3c-72ba-4be5-b29c-df1ab57f85af	\N	\N	\N	2025-10-08 11:41:16.277254	2025-10-08 11:41:16.277254	\N	\N
0626d0ef-bbb2-4a7d-b21a-6fdb4f29a290	\N	\N	\N	2025-11-05 09:43:37.632161	2025-11-05 09:43:37.632161	\N	\N
7bf2a7f3-f9df-45ea-b856-31385146709c	\N	\N	\N	2025-11-05 09:44:22.960444	2025-11-05 09:44:22.960444	\N	\N
3db6a9db-f56d-4a40-a1c0-9db04d3910a8	\N	\N	\N	2025-11-05 09:51:49.934396	2025-11-05 09:51:49.934396	\N	\N
dcb98afa-e2d3-4b6d-8773-53cbfffd95c9	\N	\N	\N	2025-11-05 09:55:01.266393	2025-11-05 09:55:01.266393	\N	\N
a0b7a416-6213-4187-9201-e750de9db5bf	\N	\N	\N	2025-11-05 09:55:03.960539	2025-11-05 09:55:03.960539	\N	\N
8ed22f29-1ee9-4767-9132-a62338e81977	\N	\N	\N	2025-11-05 09:55:51.007072	2025-11-05 09:55:51.007072	\N	\N
511302b3-90e2-4c57-8868-5774b8c0a0d5	\N	\N	\N	2025-11-05 09:55:54.961577	2025-11-05 09:55:54.961577	\N	\N
95df3946-659a-4252-b5b9-fcef777b3b20	\N	\N	\N	2025-11-05 09:56:04.218186	2025-11-05 09:56:04.218186	\N	\N
11bdf2a0-343d-4c4b-8fee-50aa67b3fad5	\N	\N	\N	2025-11-05 09:56:32.166735	2025-11-05 09:56:32.166735	\N	\N
9241a2aa-9f02-4f0b-9ddc-9984e265eaf4	\N	\N	\N	2025-11-05 09:56:35.960622	2025-11-05 09:56:35.960622	\N	\N
579f1c10-9845-4fae-b543-37561f38b949	\N	\N	\N	2025-11-05 17:02:30.776871	2025-11-05 17:02:30.776871	\N	\N
c36ee9c0-77ce-43a3-b4fc-3b263d081d4e	\N	\N	\N	2025-11-08 08:17:11.30719	2025-11-08 08:17:11.30719	\N	\N
f405e1ff-2547-4d31-bffe-edac184f2c56	\N	\N	\N	2025-11-08 08:26:32.040271	2025-11-08 08:26:32.040271	\N	\N
ba15ccc9-0f3a-4df7-bc00-9c497f5b6b50	\N	\N	\N	2025-11-09 06:43:00.984516	2025-11-09 06:43:00.984516	\N	\N
776b692a-6eec-42c6-8501-b41589e408fd	\N	\N	\N	2025-11-09 06:45:01.678675	2025-11-09 06:45:01.678675	\N	\N
34f9de6d-4062-402e-8718-349ff1829e1d	\N	\N	\N	2025-11-09 06:47:32.674446	2025-11-09 06:47:32.674446	\N	\N
0e80fb2c-dd75-4ebf-85fe-4ae88094638a	\N	\N	\N	2025-11-09 06:48:54.264166	2025-11-09 06:48:54.264166	\N	\N
0ed7d64e-2a28-462e-a773-021689a1276e	\N	\N	\N	2025-11-09 07:08:59.118804	2025-11-09 07:08:59.118804	\N	\N
6bdaf6e7-9a42-4a07-b5b0-056ad691cf57	\N	\N	\N	2025-11-09 07:13:35.088174	2025-11-09 07:13:35.088174	\N	\N
59477db2-3d5b-4258-a645-0a837320e9d6	\N	\N	\N	2025-11-09 07:34:06.360061	2025-11-09 07:34:06.360061	\N	\N
06c77711-557b-4b15-95b3-c443cfbf7838	\N	\N	\N	2025-11-14 19:17:47.979147	2025-11-14 19:17:47.979147	\N	\N
5079ba44-3af8-4d69-a623-a690316ee048	\N	\N	\N	2025-12-10 10:52:03.393394	2025-12-10 10:52:03.393394	\N	\N
6327004f-2878-45ab-b3e9-8fdb36beaafc	\N	\N	\N	2025-12-10 10:59:57.131213	2025-12-10 10:59:57.131213	\N	\N
5fe19f3c-ac6b-44e6-beb7-1087c9b2a522	\N	\N	\N	2025-12-10 11:02:23.519923	2025-12-10 11:02:23.519923	\N	\N
c8bb6e7c-ca00-4a3c-a02e-07d7d5340f23	\N	\N	\N	2025-12-10 11:08:59.332317	2025-12-10 11:08:59.332317	\N	\N
e5c1555b-578a-4520-91a6-b428e8275730	\N	\N	\N	2025-12-10 11:25:29.834454	2025-12-10 11:25:29.834454	\N	\N
8327bc9a-4d5e-447e-a92d-92bd18b13fe5	\N	\N	\N	2025-12-10 11:27:06.833897	2025-12-10 11:27:06.833897	\N	\N
2f7ce956-b996-4127-8ce8-d0568f039551	\N	\N	\N	2025-12-10 11:49:44.664601	2025-12-10 11:49:44.664601	\N	\N
26ae0fb0-df0b-4f29-acc3-0d0d3bbc751a	\N	\N	\N	2025-12-10 14:57:29.725189	2025-12-10 14:57:29.725189	\N	\N
8a1d7278-426b-43ef-b8b1-6a7219b169bf	\N	\N	\N	2025-12-10 15:01:40.26139	2025-12-10 15:01:40.26139	\N	\N
2e37084c-87eb-4487-9b78-92be485baa53	\N	\N	\N	2025-10-08 11:41:20.892846	2025-10-08 11:41:20.892846	\N	\N
033ddefa-bf2f-425f-9308-ad1f0e790023	\N	\N	\N	2025-11-05 09:45:02.224804	2025-11-05 09:45:02.224804	\N	\N
4104f333-5f76-4312-8199-7c3905efaf6d	\N	\N	\N	2025-11-05 09:46:22.760626	2025-11-05 09:46:22.760626	\N	\N
3672256b-0cb5-4af3-b572-7e4da03f803e	\N	\N	\N	2025-11-05 09:49:35.159949	2025-11-05 09:49:35.159949	\N	\N
2ad0b9c8-1c9b-4ad9-a9c8-3bf04683b22b	\N	\N	\N	2025-11-05 09:49:39.693403	2025-11-05 09:49:39.693403	\N	\N
f5c1286b-14ca-4d05-a80d-9c53f81b3a1d	\N	\N	\N	2025-11-05 09:56:21.818632	2025-11-05 09:56:21.818632	\N	\N
8e2f1294-8f9f-482e-b380-90ab642ea9f1	\N	\N	\N	2025-11-05 09:56:24.972102	2025-11-05 09:56:24.972102	\N	\N
2561df56-307a-460c-9e60-277499095fd5	\N	\N	\N	2025-11-08 08:20:17.467629	2025-11-08 08:20:17.467629	\N	\N
cc5c9bf9-2ce3-43c6-a0ad-b47ad69bfea8	\N	\N	\N	2025-11-08 08:30:41.926292	2025-11-08 08:30:41.926292	\N	\N
41da353f-c1af-4e29-ac25-ca4a71e117f5	\N	\N	\N	2025-11-09 06:46:04.364001	2025-11-09 06:46:04.364001	\N	\N
f1d91952-7d79-4848-af9d-a2d15fb14295	\N	\N	\N	2025-11-09 07:16:46.13048	2025-11-09 07:16:46.13048	\N	\N
2c6169e2-5783-4f05-9d61-27f633665f6b	\N	\N	\N	2025-11-14 19:18:09.91635	2025-11-14 19:18:09.91635	\N	\N
f43f4ec3-b156-4b56-b5f0-c826954c2353	\N	\N	\N	2025-12-10 11:02:50.443274	2025-12-10 11:02:50.443274	\N	\N
c61ac759-3484-4d69-9914-477e0f7f66c7	\N	\N	\N	2025-12-10 11:51:38.820617	2025-12-10 11:51:38.820617	\N	\N
cda2debf-2e20-4d4b-a5de-d88994642a03	\N	\N	\N	2025-11-05 09:45:11.617495	2025-11-05 09:45:11.617495	\N	\N
51da703e-c59f-4968-814a-649accc2010b	\N	\N	\N	2025-11-05 09:57:11.96063	2025-11-05 09:57:11.96063	\N	\N
52c18a44-509e-4eb4-b8ad-678fe5cace5f	\N	\N	\N	2025-11-05 09:57:52.961639	2025-11-05 09:57:52.961639	\N	\N
e25ae2b4-a0f0-407f-be3f-2e317a08d9a9	\N	\N	\N	2025-11-05 09:58:02.984028	2025-11-05 09:58:02.984028	\N	\N
c7606ec9-2d19-4f5a-8354-17977f72c75e	\N	\N	\N	2025-11-05 09:58:05.424168	2025-11-05 09:58:05.424168	\N	\N
6d2586dd-c5b3-4814-8fa1-803bcbf2d68e	\N	\N	\N	2025-11-08 08:22:17.881229	2025-11-08 08:22:17.881229	\N	\N
fb112a5a-f90c-436b-82fb-8b930133e16b	\N	\N	\N	2025-12-10 11:03:00.912205	2025-12-10 11:03:00.912205	\N	\N
ad31411e-5c54-47d5-9022-b000b7427511	\N	\N	\N	2025-11-05 09:58:49.05953	2025-11-05 09:58:49.05953	\N	\N
004af402-f0bd-40a3-8416-6713bfeea7c8	\N	\N	\N	2025-11-08 08:23:13.304308	2025-11-08 08:23:13.304308	\N	\N
40ca3184-fdcd-4616-b9de-9e75051e7c79	\N	\N	\N	2025-11-08 08:23:21.180197	2025-11-08 08:23:21.180197	\N	\N
e28c7dbb-8947-4d83-83ee-cd7b80f4ff04	\N	\N	\N	2025-10-31 17:55:47.315588	2025-10-31 17:55:47.315588	\N	\N
80759992-e5c2-4670-8fdf-cdcf65ccb9e2	\N	\N	\N	2025-10-31 17:56:27.957891	2025-10-31 17:56:27.957891	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, email, role, created_at) FROM stdin;
admin	admin	admin123	admin@example.com	admin	2025-09-11 20:52:23.605955
\.


--
-- Data for Name: vat_rates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.vat_rates (id, code, name, rate, country, description, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: work_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.work_orders (id, order_number, project_id, title, description, assigned_to, status, priority, start_date, due_date, completed_date, estimated_hours, actual_hours, created_at) FROM stdin;
\.


--
-- Name: customer_number_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.customer_number_seq', 10, true);


--
-- Name: packing_list_number_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.packing_list_number_seq', 1, true);


--
-- Name: project_number_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.project_number_seq', 2, true);


--
-- Name: prospect_number_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.prospect_number_seq', 1, false);


--
-- Name: supplier_number_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.supplier_number_seq', 4, true);


--
-- Name: work_order_number_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.work_order_number_seq', 1, true);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: company_profiles company_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.company_profiles
    ADD CONSTRAINT company_profiles_pkey PRIMARY KEY (id);


--
-- Name: countries countries_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_code_unique UNIQUE (code);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- Name: customer_contacts customer_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_contacts
    ADD CONSTRAINT customer_contacts_pkey PRIMARY KEY (id);


--
-- Name: customers customers_customer_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_customer_number_unique UNIQUE (customer_number);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: document_layout_fields document_layout_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_layout_fields
    ADD CONSTRAINT document_layout_fields_pkey PRIMARY KEY (id);


--
-- Name: document_layouts document_layouts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_layouts
    ADD CONSTRAINT document_layouts_pkey PRIMARY KEY (id);


--
-- Name: images images_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.images
    ADD CONSTRAINT images_pkey PRIMARY KEY (id);


--
-- Name: incoterms incoterms_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.incoterms
    ADD CONSTRAINT incoterms_code_unique UNIQUE (code);


--
-- Name: incoterms incoterms_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.incoterms
    ADD CONSTRAINT incoterms_pkey PRIMARY KEY (id);


--
-- Name: inventory_components inventory_components_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_components
    ADD CONSTRAINT inventory_components_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_sku_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_sku_unique UNIQUE (sku);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: languages languages_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT languages_code_key UNIQUE (code);


--
-- Name: languages languages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT languages_pkey PRIMARY KEY (id);


--
-- Name: layout_blocks layout_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.layout_blocks
    ADD CONSTRAINT layout_blocks_pkey PRIMARY KEY (id);


--
-- Name: layout_elements layout_elements_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.layout_elements
    ADD CONSTRAINT layout_elements_pkey PRIMARY KEY (id);


--
-- Name: layout_sections layout_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.layout_sections
    ADD CONSTRAINT layout_sections_pkey PRIMARY KEY (id);


--
-- Name: packing_list_items packing_list_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.packing_list_items
    ADD CONSTRAINT packing_list_items_pkey PRIMARY KEY (id);


--
-- Name: packing_lists packing_lists_packing_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.packing_lists
    ADD CONSTRAINT packing_lists_packing_number_unique UNIQUE (packing_number);


--
-- Name: packing_lists packing_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.packing_lists
    ADD CONSTRAINT packing_lists_pkey PRIMARY KEY (id);


--
-- Name: payment_days payment_days_days_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_days
    ADD CONSTRAINT payment_days_days_key UNIQUE (days);


--
-- Name: payment_days payment_days_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_days
    ADD CONSTRAINT payment_days_pkey PRIMARY KEY (id);


--
-- Name: payment_schedules payment_schedules_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_schedules
    ADD CONSTRAINT payment_schedules_code_key UNIQUE (code);


--
-- Name: payment_schedules payment_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_schedules
    ADD CONSTRAINT payment_schedules_pkey PRIMARY KEY (id);


--
-- Name: payment_terms payment_terms_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_terms
    ADD CONSTRAINT payment_terms_code_unique UNIQUE (code);


--
-- Name: payment_terms payment_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_terms
    ADD CONSTRAINT payment_terms_pkey PRIMARY KEY (id);


--
-- Name: proforma_invoices proforma_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proforma_invoices
    ADD CONSTRAINT proforma_invoices_pkey PRIMARY KEY (id);


--
-- Name: proforma_invoices proforma_invoices_proforma_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proforma_invoices
    ADD CONSTRAINT proforma_invoices_proforma_number_unique UNIQUE (proforma_number);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects projects_project_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_project_number_unique UNIQUE (project_number);


--
-- Name: prospects prospects_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_pkey PRIMARY KEY (id);


--
-- Name: prospects prospects_prospect_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_prospect_number_unique UNIQUE (prospect_number);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_order_number_unique UNIQUE (order_number);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: quotation_items quotation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quotation_items
    ADD CONSTRAINT quotation_items_pkey PRIMARY KEY (id);


--
-- Name: quotation_requests quotation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quotation_requests
    ADD CONSTRAINT quotation_requests_pkey PRIMARY KEY (id);


--
-- Name: quotation_requests quotation_requests_request_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quotation_requests
    ADD CONSTRAINT quotation_requests_request_number_unique UNIQUE (request_number);


--
-- Name: quotations quotations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_pkey PRIMARY KEY (id);


--
-- Name: quotations quotations_quotation_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_quotation_number_unique UNIQUE (quotation_number);


--
-- Name: sales_order_items sales_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_order_number_unique UNIQUE (order_number);


--
-- Name: sales_orders sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_pkey PRIMARY KEY (id);


--
-- Name: statuses statuses_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT statuses_code_unique UNIQUE (code);


--
-- Name: statuses statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT statuses_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_supplier_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_supplier_number_unique UNIQUE (supplier_number);


--
-- Name: text_snippet_usages text_snippet_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.text_snippet_usages
    ADD CONSTRAINT text_snippet_usages_pkey PRIMARY KEY (id);


--
-- Name: text_snippets text_snippets_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.text_snippets
    ADD CONSTRAINT text_snippets_code_unique UNIQUE (code);


--
-- Name: text_snippets text_snippets_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.text_snippets
    ADD CONSTRAINT text_snippets_pkey PRIMARY KEY (id);


--
-- Name: units_of_measure units_of_measure_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.units_of_measure
    ADD CONSTRAINT units_of_measure_code_unique UNIQUE (code);


--
-- Name: units_of_measure units_of_measure_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.units_of_measure
    ADD CONSTRAINT units_of_measure_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: vat_rates vat_rates_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vat_rates
    ADD CONSTRAINT vat_rates_code_unique UNIQUE (code);


--
-- Name: vat_rates vat_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vat_rates
    ADD CONSTRAINT vat_rates_pkey PRIMARY KEY (id);


--
-- Name: work_orders work_orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_order_number_unique UNIQUE (order_number);


--
-- Name: work_orders work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_pkey PRIMARY KEY (id);


--
-- Name: customer_contacts customer_contacts_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_contacts
    ADD CONSTRAINT customer_contacts_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: customers customers_address_id_addresses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_address_id_addresses_id_fk FOREIGN KEY (address_id) REFERENCES public.addresses(id);


--
-- Name: customers customers_country_code_countries_code_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_country_code_countries_code_fk FOREIGN KEY (country_code) REFERENCES public.countries(code);


--
-- Name: customers customers_language_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.languages(code);


--
-- Name: customers customers_payment_days_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_payment_days_id_fkey FOREIGN KEY (payment_days_id) REFERENCES public.payment_days(id);


--
-- Name: customers customers_payment_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_payment_schedule_id_fkey FOREIGN KEY (payment_schedule_id) REFERENCES public.payment_schedules(id);


--
-- Name: inventory_components inventory_components_component_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_components
    ADD CONSTRAINT inventory_components_component_item_id_inventory_items_id_fk FOREIGN KEY (component_item_id) REFERENCES public.inventory_items(id);


--
-- Name: inventory_components inventory_components_parent_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_components
    ADD CONSTRAINT inventory_components_parent_item_id_inventory_items_id_fk FOREIGN KEY (parent_item_id) REFERENCES public.inventory_items(id);


--
-- Name: invoice_items invoice_items_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: invoice_items invoice_items_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_item_id_inventory_items_id_fk FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: invoice_items invoice_items_source_snippet_id_text_snippets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_source_snippet_id_text_snippets_id_fk FOREIGN KEY (source_snippet_id) REFERENCES public.text_snippets(id);


--
-- Name: invoices invoices_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: invoices invoices_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: invoices invoices_quotation_id_quotations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_quotation_id_quotations_id_fk FOREIGN KEY (quotation_id) REFERENCES public.quotations(id);


--
-- Name: layout_elements layout_elements_block_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.layout_elements
    ADD CONSTRAINT layout_elements_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.layout_blocks(id);


--
-- Name: layout_elements layout_elements_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.layout_elements
    ADD CONSTRAINT layout_elements_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.layout_sections(id) ON DELETE CASCADE;


--
-- Name: layout_sections layout_sections_layout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.layout_sections
    ADD CONSTRAINT layout_sections_layout_id_fkey FOREIGN KEY (layout_id) REFERENCES public.document_layouts(id) ON DELETE CASCADE;


--
-- Name: packing_list_items packing_list_items_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.packing_list_items
    ADD CONSTRAINT packing_list_items_item_id_inventory_items_id_fk FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: packing_list_items packing_list_items_packing_list_id_packing_lists_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.packing_list_items
    ADD CONSTRAINT packing_list_items_packing_list_id_packing_lists_id_fk FOREIGN KEY (packing_list_id) REFERENCES public.packing_lists(id);


--
-- Name: packing_lists packing_lists_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.packing_lists
    ADD CONSTRAINT packing_lists_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: packing_lists packing_lists_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.packing_lists
    ADD CONSTRAINT packing_lists_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: packing_lists packing_lists_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.packing_lists
    ADD CONSTRAINT packing_lists_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: proforma_invoices proforma_invoices_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proforma_invoices
    ADD CONSTRAINT proforma_invoices_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: proforma_invoices proforma_invoices_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proforma_invoices
    ADD CONSTRAINT proforma_invoices_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: proforma_invoices proforma_invoices_quotation_id_quotations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proforma_invoices
    ADD CONSTRAINT proforma_invoices_quotation_id_quotations_id_fk FOREIGN KEY (quotation_id) REFERENCES public.quotations(id);


--
-- Name: projects projects_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: prospects prospects_address_id_addresses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_address_id_addresses_id_fk FOREIGN KEY (address_id) REFERENCES public.addresses(id);


--
-- Name: prospects prospects_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: purchase_order_items purchase_order_items_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_item_id_inventory_items_id_fk FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: purchase_order_items purchase_order_items_purchase_order_id_purchase_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_order_id_purchase_orders_id_fk FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: purchase_orders purchase_orders_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: quotation_items quotation_items_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quotation_items
    ADD CONSTRAINT quotation_items_item_id_inventory_items_id_fk FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: quotation_items quotation_items_quotation_id_quotations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quotation_items
    ADD CONSTRAINT quotation_items_quotation_id_quotations_id_fk FOREIGN KEY (quotation_id) REFERENCES public.quotations(id);


--
-- Name: quotation_items quotation_items_source_snippet_id_text_snippets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quotation_items
    ADD CONSTRAINT quotation_items_source_snippet_id_text_snippets_id_fk FOREIGN KEY (source_snippet_id) REFERENCES public.text_snippets(id);


--
-- Name: quotation_requests quotation_requests_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quotation_requests
    ADD CONSTRAINT quotation_requests_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: quotation_requests quotation_requests_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quotation_requests
    ADD CONSTRAINT quotation_requests_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: quotations quotations_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: quotations quotations_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: sales_order_items sales_order_items_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_item_id_inventory_items_id_fk FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: sales_order_items sales_order_items_sales_order_id_sales_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_sales_order_id_sales_orders_id_fk FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id);


--
-- Name: sales_order_items sales_order_items_source_snippet_id_text_snippets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_source_snippet_id_text_snippets_id_fk FOREIGN KEY (source_snippet_id) REFERENCES public.text_snippets(id);


--
-- Name: sales_orders sales_orders_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: text_snippet_usages text_snippet_usages_snippet_id_text_snippets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.text_snippet_usages
    ADD CONSTRAINT text_snippet_usages_snippet_id_text_snippets_id_fk FOREIGN KEY (snippet_id) REFERENCES public.text_snippets(id);


--
-- Name: user_preferences user_preferences_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: work_orders work_orders_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict tHd9MlFVWO8k7kbJ9qBwQvXYH62nQxOmh6OhfL3gwKwx8q4WdSkGAkEHcYggVkU

