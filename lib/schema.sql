-- =============================================
-- CASA TORO — Schema de base de datos
-- Pega esto en el SQL Editor de Supabase
-- =============================================

-- Tabla de reservas (se sincroniza con iCal de Airbnb)
create table if not exists reservas (
  id uuid default gen_random_uuid() primary key,
  airbnb_uid text unique,           -- UID del evento iCal para evitar duplicados
  huesped text,
  fecha_llegada date not null,
  fecha_salida date not null,
  noches int generated always as (fecha_salida - fecha_llegada) stored,
  ingreso_bruto numeric(12,2) default 0,  -- lo que paga el huésped
  comision_airbnb numeric(12,2) default 0,
  ingreso_neto numeric(12,2) default 0,   -- lo que recibe el anfitrión
  calificacion int check (calificacion between 1 and 5),
  resena text,
  estado text default 'confirmada' check (estado in ('confirmada','cancelada','pendiente')),
  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabla de gastos (cargados por la contadora)
create table if not exists gastos (
  id uuid default gen_random_uuid() primary key,
  mes date not null,                -- primer día del mes: 2024-05-01
  categoria text not null check (categoria in (
    'servicios_publicos','limpieza','mantenimiento',
    'suministros','impuestos','casero',
    'empleadas','piscina','arreglos','otro'
  )),
  descripcion text not null,
  monto numeric(12,2) not null,
  comprobante_url text,             -- URL del archivo subido a Supabase Storage
  registrado_por text,
  created_at timestamptz default now()
);

-- Tabla de resumen mensual (calculado, para gráficas rápidas)
create table if not exists resumen_mensual (
  id uuid default gen_random_uuid() primary key,
  mes date not null unique,
  noches_ocupadas int default 0,
  noches_disponibles int default 0,
  ingresos_brutos numeric(12,2) default 0,
  ingresos_netos numeric(12,2) default 0,
  total_gastos numeric(12,2) default 0,
  utilidad_neta numeric(12,2) generated always as (ingresos_netos - total_gastos) stored,
  comision_admin numeric(12,2) generated always as ((ingresos_netos - total_gastos) * 0.10) stored,
  calificacion_promedio numeric(3,2) default 0,
  updated_at timestamptz default now()
);

-- Tabla de configuración (datos de la propiedad)
create table if not exists configuracion (
  id int primary key default 1,
  nombre_propiedad text default 'Casa Toro',
  airbnb_url text default 'https://es-l.airbnb.com/rooms/45439655',
  instagram_handle text default 'casatoro.co',
  ical_url text,                    -- se guarda aquí después de obtenerla
  porcentaje_admin numeric(4,2) default 10.00,
  updated_at timestamptz default now()
);

-- Insertar config inicial
insert into configuracion (id, nombre_propiedad, airbnb_url, instagram_handle)
values (1, 'Casa Toro', 'https://es-l.airbnb.com/rooms/45439655', 'casatoro.co')
on conflict (id) do nothing;

-- =============================================
-- Seguridad: Row Level Security
-- =============================================

alter table reservas enable row level security;
alter table gastos enable row level security;
alter table resumen_mensual enable row level security;
alter table configuracion enable row level security;

-- Política: usuarios autenticados pueden leer todo
create policy "Lectura autenticada" on reservas for select using (auth.role() = 'authenticated');
create policy "Lectura autenticada" on gastos for select using (auth.role() = 'authenticated');
create policy "Lectura autenticada" on resumen_mensual for select using (auth.role() = 'authenticated');
create policy "Lectura autenticada" on configuracion for select using (auth.role() = 'authenticated');

-- Política: solo admin puede insertar/editar reservas
create policy "Admin edita reservas" on reservas for all using (
  auth.jwt() ->> 'email' in (
    select email from auth.users where raw_user_meta_data ->> 'rol' = 'admin'
  )
);

-- Política: contadora y admin pueden insertar gastos
create policy "Contadora inserta gastos" on gastos for insert with check (
  auth.jwt() ->> 'email' in (
    select email from auth.users where raw_user_meta_data ->> 'rol' in ('admin','contadora')
  )
);

-- Política: contadora puede editar sus propios gastos, admin todos
create policy "Contadora edita gastos" on gastos for update using (
  auth.jwt() ->> 'email' in (
    select email from auth.users where raw_user_meta_data ->> 'rol' in ('admin','contadora')
  )
);

-- =============================================
-- Storage bucket para comprobantes
-- =============================================
-- Esto lo haces manualmente en Supabase > Storage > New bucket
-- Nombre: "comprobantes", público: NO
