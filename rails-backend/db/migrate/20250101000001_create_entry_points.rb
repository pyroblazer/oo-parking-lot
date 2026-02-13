class CreateEntryPoints < ActiveRecord::Migration[7.1]
  def change
    create_table :entry_points do |t|
      t.string :identifier, null: false, index: { unique: true }
      t.string :name, null: false

      t.timestamps null: false
    end
  end
end
