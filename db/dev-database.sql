-- LOCAL DEVELOPMENT ONLY (docker-compose.yml). The production server gets the same roles with
-- generated passwords from deploy/server-setup.sh.
create role pairadox login password 'pairadox';
create role pairadox_authenticator login noinherit password 'authenticator';
grant anon, authenticated, service_role to pairadox_authenticator;
create database pairadox owner pairadox;
