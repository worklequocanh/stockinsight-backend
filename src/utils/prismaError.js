function mapPrismaError(error) {
  if (!error || typeof error !== 'object') {
    return null;
  }

  if (error.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'field';
    return {
      statusCode: 409,
      message: `Duplicate value for ${target}`,
    };
  }

  if (error.code === 'P2003') {
    return {
      statusCode: 409,
      message: 'Cannot delete or update record because it is linked to other data',
    };
  }

  if (error.code === 'P2025') {
    return {
      statusCode: 404,
      message: 'Record not found',
    };
  }

  return null;
}

module.exports = {
  mapPrismaError,
};
