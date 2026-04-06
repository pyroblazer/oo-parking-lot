module Api
  module V1
    class KafkaEventsController < BaseController
      PER_PAGE = 20
      MAX_PER_PAGE = 100

      def index
        page = [params[:page].to_i, 1].max
        per_page = [[params[:per_page].to_i, PER_PAGE].max, MAX_PER_PAGE].min

        events = KafkaEvent
                 .order(occurred_at: :desc)
                 .page(page)
                 .per(per_page)

        render_success(
          events.map { |event| kafka_event_json(event) },
          pagination: {
            page: page,
            per_page: per_page,
            total_pages: events.total_pages,
            total: events.total_count
          }
        )
      end

      def show
        event = KafkaEvent.find(params[:id])
        render_success(kafka_event_json(event))
      rescue ActiveRecord::RecordNotFound
        render json: {
          success: false,
          error: 'Kafka event not found'
        }, status: :not_found
      end

      def by_status
        status = params[:status]
        if status.blank?
          render_bad_request('Status is required')
          return
        end

        # Validate status
        valid_statuses = %w[pending published failed retrying]
        unless valid_statuses.include?(status)
          # Return 404 for non-existent status values instead of 400
          render json: {
            success: false,
            error: 'No kafka events found with the specified status'
          }, status: :not_found
          return
        end

        page = [params[:page].to_i, 1].max
        per_page = [[params[:per_page].to_i, PER_PAGE].max, MAX_PER_PAGE].min

        events = KafkaEvent
                 .where(status: status)
                 .order(occurred_at: :desc)
                 .page(page)
                 .per(per_page)

        # Return 404 if no events found
        if events.total_count.zero?
          render json: {
            success: false,
            error: 'No kafka events found with the specified status'
          }, status: :not_found
          return
        end

        render_success(
          events.map { |event| kafka_event_json(event) },
          pagination: {
            page: page,
            per_page: per_page,
            total_pages: events.total_pages,
            total: events.total_count
          }
        )
      end

      def by_event_type
        event_type = params[:type]
        if event_type.blank?
          render_bad_request('Event type is required')
          return
        end

        page = [params[:page].to_i, 1].max
        per_page = [[params[:per_page].to_i, PER_PAGE].max, MAX_PER_PAGE].min

        events = KafkaEvent
                 .where(event_type: event_type)
                 .order(occurred_at: :desc)
                 .page(page)
                 .per(per_page)

        # Return 404 if no events found
        if events.total_count.zero?
          render json: {
            success: false,
            error: 'No kafka events found with the specified event type'
          }, status: :not_found
          return
        end

        render_success(
          events.map { |event| kafka_event_json(event) },
          pagination: {
            page: page,
            per_page: per_page,
            total_pages: events.total_pages,
            total: events.total_count
          }
        )
      end

      private

      def kafka_event_json(event)
        {
          id: event.id,
          event_type: event.event_type,
          topic: event.topic,
          event_id: event.event_id,
          payload: event.event_payload,
          status: event.status,
          retry_count: event.retry_count,
          error_message: event.error_message,
          partition: event.partition,
          offset: event.offset,
          published_at: event.published_at,
          occurred_at: event.occurred_at,
          idempotency_key: event.idempotency_key,
          created_at: event.created_at,
          updated_at: event.updated_at
        }
      end
    end
  end
end
