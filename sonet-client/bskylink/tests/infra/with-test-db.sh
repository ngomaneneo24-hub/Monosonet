#!/usr/bin/env sh

# Example usage:
# ./with-test-db.sh psql notegresql://pg:password@localhost:5433/notegres -c 'select 1;'

dir=$(dirname $0)
. ${dir}/_common.sh

SERVICES="db_test" main "$@"
